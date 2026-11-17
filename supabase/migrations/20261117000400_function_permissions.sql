-- Fase 8: recortar RPCs legacy y fijar el search_path de funciones existentes.
-- Las funciones sin dependencias se conservan por compatibilidad; las de trigger
-- siguen ejecutándose al dispararse aunque sus permisos de invocación se revoquen.
BEGIN;

DO $migration$
DECLARE
  fn text;
  result_type text;
BEGIN
  -- Conservar el contrato del helper aunque el cliente actual no lo consume.
  -- El rol proviene solo del perfil activo y no eliminado de la sesión.
  IF pg_catalog.to_regprocedure('public.get_my_role()') IS NOT NULL THEN
    SELECT pg_catalog.format('%I.%I', n.nspname, t.typname)
      INTO result_type
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_type t ON t.oid=p.prorettype
      JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
     WHERE p.oid = pg_catalog.to_regprocedure('public.get_my_role()');
    EXECUTE pg_catalog.format(
      $ddl$
      CREATE OR REPLACE FUNCTION public.get_my_role()
      RETURNS %s
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
      AS $body$
        SELECT p.rol::%s
          FROM public.perfiles AS p
         WHERE p.id = (SELECT auth.uid())
           AND p.activo IS TRUE
           AND p.deleted_at IS NULL
      $body$
      $ddl$,
      result_type,
      result_type
    );
    REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
  END IF;

  -- Estos helpers legacy no tienen consumidores. Mantenerlos presentes evita
  -- romper referencias externas, pero ya no son RPCs ejecutables por clientes.
  FOREACH fn IN ARRAY ARRAY[
    'public.handle_new_user()',
    'public.validate_user_business_id()',
    'public.validate_password_strength(text)',
    'public.moddatetime()',
    'public.update_actualizado_at_column()'
  ] LOOP
    IF pg_catalog.to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE pg_catalog.format('ALTER FUNCTION %s SET search_path = %L', fn, '');
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role', fn);
    END IF;
  END LOOP;
END
$migration$;

COMMIT;
