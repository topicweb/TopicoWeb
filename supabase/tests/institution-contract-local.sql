-- Ejecutar exclusivamente en stack sintético local; todo revierte.
BEGIN;
CREATE OR REPLACE FUNCTION public.update_actualizado_at_column() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.actualizado_at=now(); RETURN NEW; END $$;
CREATE TRIGGER trigger_instituciones_actualizado_at BEFORE UPDATE ON public.instituciones FOR EACH ROW EXECUTE FUNCTION public.update_actualizado_at_column();
-- Mismo cambio de la migración fase 5.
DROP TRIGGER IF EXISTS trigger_instituciones_actualizado_at ON public.instituciones;
INSERT INTO public.instituciones(id,nombre) VALUES ('55555555-5555-4555-8555-555555555555','phase5 synthetic');
UPDATE public.instituciones SET nombre='phase5 updated' WHERE id='55555555-5555-4555-8555-555555555555';
DO $$ BEGIN ASSERT (SELECT nombre='phase5 updated' FROM public.instituciones WHERE id='55555555-5555-4555-8555-555555555555'); END $$;
ROLLBACK;
