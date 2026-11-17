-- Fase 6. Desplegar antes del cliente incremental. No cambia RLS ni grants de tablas.
BEGIN;
CREATE TABLE private.sync_clock (id boolean PRIMARY KEY DEFAULT true CHECK(id), watermark timestamptz NOT NULL);
INSERT INTO private.sync_clock VALUES(true, '-infinity');
REVOKE ALL ON private.sync_clock FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.sync_stamp() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  -- Compartido hasta COMMIT: una frontera espera a todos los escritores previos.
  PERFORM pg_catalog.pg_advisory_xact_lock_shared(726061706::bigint);
  -- No confiar en el timestamp suministrado por el dispositivo.
  SELECT greatest(pg_catalog.clock_timestamp(), watermark + interval '1 microsecond') INTO NEW.actualizado_at FROM private.sync_clock WHERE id FOR SHARE;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.sync_stamp() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['perfiles','programas_estudio','pacientes','medicamentos','atenciones','movimientos_stock'] LOOP
  EXECUTE format('CREATE TRIGGER zzzz_topico_sync_stamp BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.sync_stamp()',t);
  EXECUTE format('UPDATE public.%I SET actualizado_at=clock_timestamp() WHERE actualizado_at IS NULL',t);
  EXECUTE format('ALTER TABLE public.%I ALTER COLUMN actualizado_at SET NOT NULL',t);
 END LOOP;
END $$;
CREATE FUNCTION public.topico_sync_boundary() RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE boundary timestamptz;
BEGIN
 IF private.current_business_id() IS NULL THEN RAISE EXCEPTION 'Sync profile rejected' USING ERRCODE='42501'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(726061706::bigint);
 -- Incluir timestamps históricos futuros sin depender del reloj del cliente.
 SELECT greatest(pg_catalog.clock_timestamp(), (SELECT watermark FROM private.sync_clock WHERE id),
  (SELECT max(actualizado_at) FROM public.perfiles),(SELECT max(actualizado_at) FROM public.programas_estudio),
  (SELECT max(actualizado_at) FROM public.pacientes),(SELECT max(actualizado_at) FROM public.medicamentos),
  (SELECT max(actualizado_at) FROM public.atenciones),(SELECT max(actualizado_at) FROM public.movimientos_stock)) INTO boundary;
 UPDATE private.sync_clock SET watermark=boundary WHERE id;
 RETURN boundary;
END $$;
REVOKE ALL ON FUNCTION public.topico_sync_boundary() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.topico_sync_boundary() TO authenticated;
COMMIT;
