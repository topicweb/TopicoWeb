-- Fases 1/2 coordinadas. Validar primero en staging; no aplicar automáticamente.
-- Compatible con las Server Actions service_role y el sync por tenant.
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
REVOKE CREATE ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.current_business_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.business_id FROM public.perfiles p
  WHERE p.id = (SELECT auth.uid()) AND p.activo IS TRUE
    AND p.deleted_at IS NULL
$$;
REVOKE ALL ON FUNCTION private.current_business_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_business_id() TO authenticated;

-- Quitar todas las políticas anteriores: las permisivas se combinan con OR.
DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT schemaname,tablename,policyname FROM pg_policies
    WHERE schemaname='public' AND tablename IN
      ('instituciones','perfiles','programas_estudio','pacientes','medicamentos','atenciones','movimientos_stock')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I',item.policyname,item.schemaname,item.tablename);
  END LOOP;
END $$;

REVOKE ALL ON public.instituciones,public.perfiles,public.programas_estudio,
  public.pacientes,public.medicamentos,public.atenciones,public.movimientos_stock
  FROM PUBLIC,anon,authenticated;
-- Revocar también posibles grants de columna, que sobreviven a los de tabla.
DO $$
DECLARE t text; col text;
BEGIN
  FOREACH t IN ARRAY ARRAY['instituciones','perfiles','programas_estudio','pacientes','medicamentos','atenciones','movimientos_stock']
  LOOP
    FOR col IN SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t
    LOOP
      EXECUTE format('REVOKE ALL (%I) ON public.%I FROM PUBLIC,anon,authenticated',col,t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  END LOOP;
END $$;

GRANT SELECT ON public.instituciones,public.perfiles,public.programas_estudio TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.pacientes,public.medicamentos,
  public.atenciones,public.movimientos_stock TO authenticated;

ALTER TABLE public.perfiles ALTER COLUMN rol SET DEFAULT 'personal'::public.rol_usuario;
-- Perfil propio visible incluso desactivado: bootstrap detecta y rechaza sesión.
CREATE POLICY perfil_read ON public.perfiles FOR SELECT TO authenticated
  USING (id=(SELECT auth.uid()) OR business_id=(SELECT private.current_business_id()));
-- No escritura directa de perfiles: acciones servidor validan actor y destino.
CREATE POLICY institution_read ON public.instituciones FOR SELECT TO authenticated
  USING (id=(SELECT private.current_business_id()));
CREATE POLICY program_read ON public.programas_estudio FOR SELECT TO authenticated
  USING (business_id=(SELECT private.current_business_id()));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pacientes','medicamentos','atenciones','movimientos_stock']
  LOOP
    EXECUTE format('CREATE POLICY tenant_read ON public.%I FOR SELECT TO authenticated USING (business_id=(SELECT private.current_business_id()))',t);
    EXECUTE format('CREATE POLICY tenant_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (business_id=(SELECT private.current_business_id()))',t);
    EXECUTE format('CREATE POLICY tenant_update ON public.%I FOR UPDATE TO authenticated USING (business_id=(SELECT private.current_business_id())) WITH CHECK (business_id=(SELECT private.current_business_id()))',t);
  END LOOP;
END $$;
COMMIT;
