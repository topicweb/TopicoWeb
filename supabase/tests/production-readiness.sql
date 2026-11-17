-- Readiness after the approved test-data cleanup. No committed writes.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $checks$ DECLARE t text; BEGIN
 ASSERT public.topico_user_consistency_ready(), 'Auth/profile triggers not ready';
 FOREACH t IN ARRAY ARRAY['instituciones','perfiles','programas_estudio','pacientes','medicamentos','atenciones','movimientos_stock'] LOOP
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||t)::regclass), 'RLS missing';
  ASSERT NOT has_table_privilege('anon','public.'||t,'SELECT'), 'Anonymous table access';
  ASSERT NOT has_table_privilege('authenticated','public.'||t,'DELETE'), 'Physical delete allowed';
 END LOOP;
 ASSERT NOT has_column_privilege('authenticated','public.perfiles','rol','UPDATE');
 ASSERT NOT has_column_privilege('authenticated','public.perfiles','business_id','UPDATE');
 ASSERT NOT has_column_privilege('authenticated','public.perfiles','activo','UPDATE');
 ASSERT NOT has_column_privilege('authenticated','public.medicamentos','stock_actual','UPDATE');
 ASSERT NOT has_column_privilege('authenticated','public.medicamentos','stock_actual','INSERT');
 ASSERT NOT has_function_privilege('anon','public.topico_sync_boundary()','EXECUTE');
 ASSERT NOT has_function_privilege('anon','public.topico_stock_snapshot(uuid[],uuid[])','EXECUTE');
 ASSERT NOT has_function_privilege('authenticated','public.topico_user_consistency_ready()','EXECUTE');
 ASSERT NOT has_function_privilege('authenticated','public.validate_password_strength(text)','EXECUTE');
 ASSERT (SELECT count(*)=6 FROM information_schema.columns WHERE table_schema='public'
  AND column_name='actualizado_at' AND is_nullable='NO'
  AND table_name IN ('perfiles','programas_estudio','pacientes','medicamentos','atenciones','movimientos_stock'));
 ASSERT (SELECT count(*)=5 FROM pg_constraint WHERE conname IN
  ('pacientes_programa_tenant_fk','atenciones_paciente_tenant_fk','atenciones_perfil_tenant_fk',
   'movimientos_medicamento_tenant_fk','movimientos_atencion_tenant_fk') AND convalidated);
 ASSERT to_regclass('public.idx_pacientes_business_dni') IS NULL;
 ASSERT to_regclass('public.idx_perfiles_email') IS NULL;
 ASSERT to_regclass('public.pacientes_business_id_dni_key') IS NOT NULL;
 ASSERT to_regclass('public.perfiles_email_key') IS NOT NULL;
 ASSERT NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.instituciones'::regclass AND tgname='trigger_instituciones_actualizado_at');
 ASSERT (SELECT count(*)=0 FROM public.pacientes);
 ASSERT (SELECT count(*)=0 FROM public.atenciones);
 ASSERT (SELECT count(*)=0 FROM public.medicamentos);
 ASSERT (SELECT count(*)=0 FROM public.movimientos_stock);
 ASSERT EXISTS(SELECT 1 FROM public.perfiles p JOIN auth.users u ON u.id=p.id
  WHERE p.rol='admin' AND p.activo IS TRUE AND p.deleted_at IS NULL AND u.email_confirmed_at IS NOT NULL);
 PERFORM set_config('request.jwt.claim.sub',(SELECT id::text FROM public.perfiles
  WHERE rol='admin' AND activo IS TRUE AND deleted_at IS NULL LIMIT 1),true);
END $checks$;
SET LOCAL ROLE authenticated;
DO $actor$ BEGIN
 ASSERT private.current_business_id() IS NOT NULL;
 ASSERT (SELECT count(*)>0 FROM public.instituciones);
 ASSERT public.topico_sync_boundary() IS NOT NULL;
 ASSERT public.topico_stock_snapshot('{}','{}')='{"medicamentos":[],"applied_ids":[]}'::jsonb;
 BEGIN
  UPDATE public.perfiles SET rol='admin' WHERE id=auth.uid();
  RAISE EXCEPTION 'Privilege update unexpectedly allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.medicamentos SET stock_actual=100;
  RAISE EXCEPTION 'Absolute stock update unexpectedly allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub','ffffffff-ffff-4fff-8fff-ffffffffffff',true);
 ASSERT private.current_business_id() IS NULL;
 ASSERT (SELECT count(*)=0 FROM public.instituciones);
 ASSERT (SELECT count(*)=0 FROM public.perfiles);
END $actor$;
RESET ROLE;
ROLLBACK;
SELECT 'production_schema_and_access_verified' AS result;
