DO $$ BEGIN
 ASSERT to_regclass('public.idx_pacientes_business_dni') IS NULL;
 ASSERT to_regclass('public.idx_perfiles_email') IS NULL;
 ASSERT NOT EXISTS (SELECT oid,definition FROM preserved_constraints EXCEPT
  SELECT oid,pg_get_constraintdef(oid) FROM pg_constraint);
 ASSERT (SELECT indisunique AND indisvalid FROM pg_index WHERE indexrelid='public.pacientes_business_id_dni_key'::regclass);
 ASSERT (SELECT indisunique AND indisvalid FROM pg_index WHERE indexrelid='public.perfiles_email_key'::regclass);
 BEGIN
  INSERT INTO public.pacientes(business_id,dni,nombres,apellidos,categoria)
   VALUES(md5('tenant1')::uuid,'100000','Duplicate','Synthetic','estudiante');
  RAISE EXCEPTION 'Expected unique violation';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
  INSERT INTO auth.users(id) VALUES(md5('duplicate_actor')::uuid);
  INSERT INTO public.perfiles(id,email) VALUES(md5('duplicate_actor')::uuid,'actor@example.invalid');
  RAISE EXCEPTION 'Expected unique violation';
 EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
SET ROLE authenticated;
SELECT public.perf_measure('dni_after',$q$SELECT * FROM public.pacientes
 WHERE business_id=md5('tenant1')::uuid AND dni='100000'$q$);
DO $$ BEGIN
 ASSERT (SELECT count(*)=10000 FROM public.pacientes);
 ASSERT (SELECT count(*)=0 FROM public.pacientes WHERE business_id=md5('tenant2')::uuid);
 ASSERT (SELECT count(*)=1 FROM public.pacientes WHERE dni='100000');
END $$;
RESET ROLE;
SELECT jsonb_build_object('label','duplicate_storage_after','bytes',coalesce(sum(pg_relation_size(indexrelid)),0))
 FROM pg_index WHERE indexrelid IN (to_regclass('public.idx_pacientes_business_dni'),to_regclass('public.idx_perfiles_email'));
