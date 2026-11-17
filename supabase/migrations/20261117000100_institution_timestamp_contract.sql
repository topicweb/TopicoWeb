-- Fase 5: instituciones no contiene actualizado_at; no añadir columna artificial.
-- No modifica grants ni habilita PUSH de instituciones.
BEGIN;
DROP TRIGGER IF EXISTS trigger_instituciones_actualizado_at ON public.instituciones;
COMMIT;
