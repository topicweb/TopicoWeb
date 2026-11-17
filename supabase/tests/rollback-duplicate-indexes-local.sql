-- Definiciones exactas reconsultadas por MCP. Ensayar solo en base sintetica.
-- Produccion: revisar ventana/locks; CREATE INDEX CONCURRENTLY requiere otro
-- procedimiento fuera de transaccion. Nunca retirar los indices UNIQUE.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE INDEX idx_pacientes_business_dni ON public.pacientes USING btree (business_id,dni);
CREATE INDEX idx_perfiles_email ON public.perfiles USING btree (email);
COMMIT;
DO $$ BEGIN
 ASSERT to_regclass('public.idx_pacientes_business_dni') IS NOT NULL;
 ASSERT to_regclass('public.idx_perfiles_email') IS NOT NULL;
END $$;
