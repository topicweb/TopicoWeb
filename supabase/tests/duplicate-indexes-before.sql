CREATE INDEX idx_perfiles_email ON public.perfiles(email);
CREATE TEMP TABLE preserved_constraints AS
 SELECT oid,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace;
SELECT jsonb_build_object('label','duplicate_storage_before','bytes',sum(pg_relation_size(indexrelid)))
 FROM pg_index WHERE indexrelid IN ('public.idx_pacientes_business_dni'::regclass,'public.idx_perfiles_email'::regclass);
SET ROLE authenticated;
SELECT public.perf_measure('dni_before',$q$SELECT * FROM public.pacientes
 WHERE business_id=md5('tenant1')::uuid AND dni='100000'$q$);
RESET ROLE;
