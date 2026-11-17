-- SOLO base temporal del runner. 100k filas / 10 tenants, sin datos reales.
-- Indices de pacientes reconsultados por MCP; fixture no los incorpora.
CREATE INDEX idx_pacientes_business_id ON public.pacientes(business_id);
CREATE INDEX idx_pacientes_business_dni ON public.pacientes(business_id,dni);
CREATE INDEX idx_pacientes_dni ON public.pacientes(dni);
CREATE INDEX idx_pacientes_programa_id ON public.pacientes(programa_id);
CREATE INDEX idx_pacientes_fecha_nacimiento ON public.pacientes(fecha_nacimiento);
CREATE INDEX idx_pacientes_telefono ON public.pacientes(telefono);
INSERT INTO public.instituciones(id,nombre)
 SELECT md5('tenant'||g)::uuid,'Synthetic '||g FROM generate_series(1,10) g;
INSERT INTO auth.users(id) VALUES(md5('actor')::uuid);
INSERT INTO public.perfiles(id,business_id,email,rol)
 VALUES(md5('actor')::uuid,md5('tenant1')::uuid,'actor@example.invalid','personal');
INSERT INTO public.pacientes(id,business_id,dni,nombres,apellidos,categoria)
 SELECT md5('patient'||g)::uuid,md5('tenant'||(1+(g%10)))::uuid,
 g::text,'Synthetic','Patient','estudiante' FROM generate_series(1,100000) g;
-- Fijar distribucion temporal como si fueran cambios historicos del servidor.
-- Solo el fixture: volver a habilitar ANTES de medir las escrituras.
ALTER TABLE public.pacientes DISABLE TRIGGER zzzz_topico_sync_stamp;
UPDATE public.pacientes SET actualizado_at='2026-01-01 UTC'::timestamptz + (dni::int * interval '1 second');
ALTER TABLE public.pacientes ENABLE TRIGGER zzzz_topico_sync_stamp;
ANALYZE public.pacientes;
CREATE FUNCTION public.perf_measure(label text, query text) RETURNS jsonb
 LANGUAGE plpgsql AS $$
 DECLARE plan jsonb; times numeric[]='{}'; hits numeric[]='{}'; i int;
 BEGIN
  FOR i IN 1..9 LOOP
   EXECUTE 'EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '||query INTO plan;
   IF i>2 THEN
    times=array_append(times,(plan->0->>'Execution Time')::numeric);
    hits=array_append(hits,(plan->0->'Plan'->>'Shared Hit Blocks')::numeric);
   END IF;
  END LOOP;
  RETURN jsonb_build_object('label',label,'role',current_user,'runs_ms',times,
   'median_ms',(SELECT percentile_cont(0.5) WITHIN GROUP(ORDER BY v) FROM unnest(times) v),
   'shared_hits',hits,'plan',plan->0->'Plan');
 END $$;
GRANT EXECUTE ON FUNCTION public.perf_measure(text,text) TO authenticated;
SET ROLE authenticated;
DO $$ BEGIN PERFORM set_config('request.jwt.claim.sub',md5('actor')::uuid::text,false); END $$;
-- Mismo filtro/orden/limite que PULL; segunda consulta con OR keyset.
CREATE TEMP TABLE expected AS SELECT id FROM public.pacientes
 WHERE business_id=md5('tenant1')::uuid AND actualizado_at>='2026-01-02 03:13:20 UTC'
 AND actualizado_at<='2026-01-03 UTC' ORDER BY actualizado_at,id LIMIT 200;
SELECT public.perf_measure('before', $q$SELECT * FROM public.pacientes
 WHERE business_id=md5('tenant1')::uuid AND actualizado_at>='2026-01-02 03:13:20 UTC'
 AND actualizado_at<='2026-01-03 UTC' ORDER BY actualizado_at,id LIMIT 200$q$);
SELECT public.perf_measure('keyset_before', $q$SELECT * FROM public.pacientes
 WHERE business_id=md5('tenant1')::uuid AND actualizado_at>='2026-01-02 03:13:20 UTC'
 AND actualizado_at<='2026-01-03 UTC'
 AND (actualizado_at>'2026-01-02 03:30:00 UTC' OR (actualizado_at='2026-01-02 03:30:00 UTC' AND id>md5('patient99000')::uuid))
 ORDER BY actualizado_at,id LIMIT 200$q$);
SELECT public.perf_measure('write_before', $q$UPDATE public.pacientes SET telefono='synthetic'
 WHERE business_id=md5('tenant1')::uuid AND dni::int BETWEEN 1 AND 2000$q$);
RESET ROLE;
CREATE INDEX idx_pacientes_business_actualizado_id ON public.pacientes(business_id,actualizado_at,id);
ANALYZE public.pacientes;
SET ROLE authenticated;
SELECT public.perf_measure('after', $q$SELECT * FROM public.pacientes
 WHERE business_id=md5('tenant1')::uuid AND actualizado_at>='2026-01-02 03:13:20 UTC'
 AND actualizado_at<='2026-01-03 UTC' ORDER BY actualizado_at,id LIMIT 200$q$);
SELECT public.perf_measure('keyset_after', $q$SELECT * FROM public.pacientes
 WHERE business_id=md5('tenant1')::uuid AND actualizado_at>='2026-01-02 03:13:20 UTC'
 AND actualizado_at<='2026-01-03 UTC'
 AND (actualizado_at>'2026-01-02 03:30:00 UTC' OR (actualizado_at='2026-01-02 03:30:00 UTC' AND id>md5('patient99000')::uuid))
 ORDER BY actualizado_at,id LIMIT 200$q$);
DO $$ BEGIN
 ASSERT NOT EXISTS ((SELECT id FROM public.pacientes WHERE business_id=md5('tenant1')::uuid
  AND actualizado_at>='2026-01-02 03:13:20 UTC' AND actualizado_at<='2026-01-03 UTC'
  ORDER BY actualizado_at,id LIMIT 200) EXCEPT SELECT id FROM expected);
 ASSERT (SELECT count(*)=200 FROM expected);
 ASSERT (SELECT count(*)=200 FROM (SELECT id FROM public.pacientes WHERE business_id=md5('tenant1')::uuid
  AND actualizado_at>='2026-01-02 03:13:20 UTC' AND actualizado_at<='2026-01-03 UTC'
  ORDER BY actualizado_at,id LIMIT 200) page);
 ASSERT (SELECT count(*)=0 FROM public.pacientes WHERE business_id=md5('tenant2')::uuid);
END $$;
SELECT public.perf_measure('write_after', $q$UPDATE public.pacientes SET telefono='synthetic'
 WHERE business_id=md5('tenant1')::uuid AND dni::int BETWEEN 1 AND 2000$q$);
RESET ROLE;
SELECT jsonb_build_object('label','candidate_index_storage','bytes',pg_relation_size('public.idx_pacientes_business_actualizado_id'));
-- Ensayo de rollback: definicion exacta inversa, sin tocar restricciones/RLS.
DROP INDEX public.idx_pacientes_business_actualizado_id;
SET ROLE authenticated;
DO $$ BEGIN ASSERT (SELECT count(*)=10000 FROM public.pacientes); END $$;
RESET ROLE;
