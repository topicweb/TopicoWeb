-- Diagnóstico como campo propio de la atención (además de motivo y observación).
-- FR/FC viven dentro de signos_vitales (jsonb); solo se actualiza el default.

ALTER TABLE public.atenciones
  ADD COLUMN IF NOT EXISTS diagnostico text;

ALTER TABLE public.atenciones
  ALTER COLUMN signos_vitales SET DEFAULT '{"temp":"","presion":"","saturacion":"","fr":"","fc":""}'::jsonb;
