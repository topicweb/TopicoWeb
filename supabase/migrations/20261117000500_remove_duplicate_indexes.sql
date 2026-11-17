-- Fase 9: solo duplicados exactos de indices UNIQUE de restricciones existentes.
-- Aplicar tras fases 1-8, en ventana revisada. Sin CASCADE; abortar ante drift.
BEGIN;
SET LOCAL lock_timeout = '5s';
-- Impedir DDL concurrente entre la comprobacion de catalogo y el DROP.
LOCK TABLE public.pacientes,public.perfiles IN ACCESS EXCLUSIVE MODE;
DO $migration$
DECLARE pair record; redundant pg_catalog.pg_index; keeper pg_catalog.pg_index;
BEGIN
 FOR pair IN SELECT * FROM (VALUES
  ('public.idx_pacientes_business_dni','public.pacientes_business_id_dni_key','public.pacientes'),
  ('public.idx_perfiles_email','public.perfiles_email_key','public.perfiles')
 ) AS pairs(candidate, retained, target) LOOP
  IF pg_catalog.to_regclass(pair.candidate) IS NULL THEN CONTINUE; END IF;
  SELECT * INTO redundant FROM pg_catalog.pg_index WHERE indexrelid=pg_catalog.to_regclass(pair.candidate);
  SELECT * INTO keeper FROM pg_catalog.pg_index WHERE indexrelid=pg_catalog.to_regclass(pair.retained);
  IF redundant.indexrelid IS NULL OR keeper.indexrelid IS NULL
   OR redundant.indrelid <> pg_catalog.to_regclass(pair.target)
   OR redundant.indrelid <> keeper.indrelid
   OR redundant.indisunique OR redundant.indisprimary OR redundant.indisreplident OR redundant.indisclustered
   OR NOT redundant.indisvalid OR NOT redundant.indisready
   OR NOT keeper.indisunique OR NOT keeper.indisvalid OR NOT keeper.indisready
   OR redundant.indkey <> keeper.indkey OR redundant.indclass <> keeper.indclass
   OR redundant.indcollation <> keeper.indcollation OR redundant.indoption <> keeper.indoption
   OR redundant.indnatts <> keeper.indnatts OR redundant.indnkeyatts <> keeper.indnkeyatts
   OR redundant.indexprs IS NOT NULL OR keeper.indexprs IS NOT NULL
   OR redundant.indpred IS NOT NULL OR keeper.indpred IS NOT NULL
   OR (SELECT relam FROM pg_catalog.pg_class WHERE oid=redundant.indexrelid)
      <> (SELECT relam FROM pg_catalog.pg_class WHERE oid=keeper.indexrelid)
   OR EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conindid=redundant.indexrelid)
   OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conindid=keeper.indexrelid AND contype='u')
  THEN RAISE EXCEPTION 'Duplicate index precondition failed for %',pair.candidate;
  END IF;
  EXECUTE pg_catalog.format('DROP INDEX %s RESTRICT',redundant.indexrelid::pg_catalog.regclass);
 END LOOP;
END $migration$;
COMMIT;
