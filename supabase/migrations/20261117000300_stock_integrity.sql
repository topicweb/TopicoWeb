-- Fase 7. Aplicar únicamente tras auditar datos y coordinar clientes/colas.
-- El saldo existente se conserva como apertura: no reconstruir historia.
BEGIN;
-- La captura de apertura y la instalación de la autoridad deben excluir escritores.
LOCK TABLE public.medicamentos,public.movimientos_stock IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE private.stock_opening_balances (
  medicamento_id uuid PRIMARY KEY REFERENCES public.medicamentos(id) ON DELETE CASCADE,
  stock integer NOT NULL CHECK (stock>=0), captured_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO private.stock_opening_balances(medicamento_id,stock)
  SELECT id,stock_actual FROM public.medicamentos;
CREATE TABLE private.stock_applied_events (
  movimiento_id uuid PRIMARY KEY REFERENCES public.movimientos_stock(id) ON DELETE CASCADE,
  medicamento_id uuid NOT NULL REFERENCES public.medicamentos(id) ON DELETE CASCADE,
  delta integer NOT NULL, applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON private.stock_opening_balances,private.stock_applied_events FROM PUBLIC,anon,authenticated;

ALTER TABLE public.pacientes ADD CONSTRAINT pacientes_tenant_id UNIQUE (business_id,id);
ALTER TABLE public.perfiles ADD CONSTRAINT perfiles_tenant_id UNIQUE (business_id,id);
ALTER TABLE public.programas_estudio ADD CONSTRAINT programas_tenant_id UNIQUE (business_id,id);
ALTER TABLE public.atenciones ADD CONSTRAINT atenciones_tenant_id UNIQUE (business_id,id);
ALTER TABLE public.medicamentos ADD CONSTRAINT medicamentos_tenant_id UNIQUE (business_id,id);
ALTER TABLE public.pacientes ADD CONSTRAINT pacientes_programa_tenant_fk
  FOREIGN KEY (business_id,programa_id) REFERENCES public.programas_estudio(business_id,id);
ALTER TABLE public.atenciones ADD CONSTRAINT atenciones_paciente_tenant_fk
  FOREIGN KEY (business_id,paciente_id) REFERENCES public.pacientes(business_id,id);
ALTER TABLE public.atenciones ADD CONSTRAINT atenciones_perfil_tenant_fk
  FOREIGN KEY (business_id,perfil_id) REFERENCES public.perfiles(business_id,id);
ALTER TABLE public.movimientos_stock ADD CONSTRAINT movimientos_medicamento_tenant_fk
  FOREIGN KEY (business_id,medicamento_id) REFERENCES public.medicamentos(business_id,id);
ALTER TABLE public.movimientos_stock ADD CONSTRAINT movimientos_atencion_tenant_fk
  FOREIGN KEY (business_id,atencion_id) REFERENCES public.atenciones(business_id,id);
ALTER TABLE public.medicamentos ADD CONSTRAINT medicamentos_stock_valido
  CHECK (stock_actual IS NOT NULL AND stock_actual >= 0 AND stock_minimo IS NOT NULL AND stock_minimo >= 0);
ALTER TABLE public.movimientos_stock ADD CONSTRAINT movimientos_cantidad_valida CHECK (cantidad > 0 AND tipo IS NOT NULL);

-- Ningún cliente puede sobrescribir saldo absoluto, ni siquiera en INSERT/upsert.
REVOKE INSERT,UPDATE ON public.medicamentos FROM PUBLIC,anon,authenticated;
DO $$ DECLARE col text; BEGIN
  FOR col IN SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='medicamentos'
  LOOP
    EXECUTE format('REVOKE INSERT (%I), UPDATE (%I) ON public.medicamentos FROM PUBLIC,anon,authenticated',col,col);
    IF col NOT IN ('stock_actual','tipo_medida','business_id','id') THEN
      EXECUTE format('GRANT INSERT (%I), UPDATE (%I) ON public.medicamentos TO authenticated',col,col);
    END IF;
  END LOOP;
END $$;
GRANT INSERT (id,business_id,tipo_medida),UPDATE (id,business_id,tipo_medida) ON public.medicamentos TO authenticated;

-- Evitar reinterpretar stock/historia cambiando de medida una vez usado el ítem.
CREATE FUNCTION private.guard_stock_measure() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.tipo_medida IS DISTINCT FROM OLD.tipo_medida AND
    (OLD.stock_actual <> 0 OR EXISTS (SELECT 1 FROM public.movimientos_stock WHERE medicamento_id=OLD.id)) THEN
    RAISE EXCEPTION 'Stock measure already in use' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_stock_measure() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER stock_measure_guard BEFORE UPDATE ON public.medicamentos
FOR EACH ROW EXECUTE FUNCTION private.guard_stock_measure();

-- UPDATE idéntico es replay por UUID; modificar un evento confirmado se rechaza.
CREATE FUNCTION private.guard_stock_event() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF (to_jsonb(NEW)-'actualizado_at'-'sync_status') IS DISTINCT FROM
     (to_jsonb(OLD)-'actualizado_at'-'sync_status') THEN
    RAISE EXCEPTION 'Confirmed stock event is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_stock_event() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER stock_event_guard BEFORE UPDATE ON public.movimientos_stock
FOR EACH ROW EXECUTE FUNCTION private.guard_stock_event();

-- AFTER INSERT solo se ejecuta para UUID nuevos; saldo y evento confirman juntos.
CREATE FUNCTION private.apply_stock_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE med public.medicamentos; delta bigint;
BEGIN
  SELECT * INTO STRICT med FROM public.medicamentos
    WHERE id=NEW.medicamento_id AND business_id=NEW.business_id FOR NO KEY UPDATE;
  IF NEW.tipo_medida <> med.tipo_medida THEN
    RAISE EXCEPTION 'Stock measure mismatch' USING ERRCODE='23514';
  END IF;
  delta := CASE NEW.tipo WHEN 'ENTRADA' THEN NEW.cantidad::bigint ELSE -NEW.cantidad::bigint END;
  IF med.stock_actual::bigint+delta NOT BETWEEN 0 AND 2147483647 THEN
    RAISE EXCEPTION 'Insufficient stock or stock overflow' USING ERRCODE='23514';
  END IF;
  UPDATE public.medicamentos SET stock_actual=(med.stock_actual::bigint+delta)::integer
    WHERE id=med.id AND business_id=NEW.business_id;
  INSERT INTO private.stock_applied_events(movimiento_id,medicamento_id,delta)
    VALUES (NEW.id,med.id,delta::integer);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.apply_stock_event() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER stock_event_apply AFTER INSERT ON public.movimientos_stock
FOR EACH ROW EXECUTE FUNCTION private.apply_stock_event();

-- Una sola sentencia/snapshot MVCC: saldo e IDs aplicados consistentes entre sí.
CREATE FUNCTION public.topico_stock_snapshot(medicine_ids uuid[], pending_ids uuid[])
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT jsonb_build_object(
    'medicamentos',COALESCE((SELECT jsonb_agg(to_jsonb(m)) FROM public.medicamentos m
      WHERE m.business_id=(SELECT private.current_business_id()) AND m.id=ANY(medicine_ids)),'[]'::jsonb),
    'applied_ids',COALESCE((SELECT jsonb_agg(s.id) FROM public.movimientos_stock s
      WHERE s.business_id=(SELECT private.current_business_id()) AND s.id=ANY(pending_ids)),'[]'::jsonb))
$$;
REVOKE ALL ON FUNCTION public.topico_stock_snapshot(uuid[],uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.topico_stock_snapshot(uuid[],uuid[]) TO authenticated;
COMMIT;
