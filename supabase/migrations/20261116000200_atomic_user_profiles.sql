-- Fase 4b: aplicar y validar antes de desplegar las acciones que la requieren.
-- No activa handle_new_user ni provisiona registros de signup sin contexto servidor.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.topico_provision_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE context jsonb; tenant uuid; actor uuid;
BEGIN
  context := NEW.raw_app_meta_data -> 'topico_provisioning';
  IF context IS NULL THEN RETURN NEW; END IF;
  IF jsonb_typeof(context) <> 'object' THEN
    RAISE EXCEPTION 'Invalid provisioning context' USING ERRCODE='23514';
  END IF;
  tenant := (context ->> 'business_id')::uuid;
  actor := (context ->> 'requested_by')::uuid;
  IF context ->> 'version' IS DISTINCT FROM '1'
    OR (context ->> 'request_id')::uuid IS NULL
    OR tenant IS NULL OR actor IS NULL
    OR COALESCE(context ->> 'rol','') NOT IN ('admin','personal')
    OR COALESCE(length(btrim(context ->> 'nombre')),0) NOT BETWEEN 1 AND 150
    OR jsonb_typeof(context -> 'activo') IS DISTINCT FROM 'boolean'
    OR NOT EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id=actor
      AND p.business_id=tenant AND p.rol='admin'::public.rol_usuario
      AND p.activo IS TRUE AND p.deleted_at IS NULL)
  THEN RAISE EXCEPTION 'Provisioning not authorized' USING ERRCODE='42501'; END IF;

  INSERT INTO public.perfiles(id,business_id,nombre,email,rol,activo,sync_status)
  VALUES (NEW.id,tenant,btrim(context ->> 'nombre'),NEW.email,
    (context ->> 'rol')::public.rol_usuario,(context ->> 'activo')::boolean,'synced');
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION private.topico_mirror_auth_email() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.perfiles SET email=NEW.email,actualizado_at=now()
      WHERE id=NEW.id AND email IS DISTINCT FROM NEW.email;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION private.topico_guard_profile_email() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE canonical_email text;
BEGIN
  SELECT u.email INTO canonical_email FROM auth.users u WHERE u.id=NEW.id;
  IF canonical_email IS NULL OR lower(btrim(NEW.email)) IS DISTINCT FROM lower(canonical_email) THEN
    RAISE EXCEPTION 'Profile email must match Auth' USING ERRCODE='23514';
  END IF;
  NEW.email := canonical_email;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION private.topico_provision_profile(),
  private.topico_mirror_auth_email(),private.topico_guard_profile_email()
  FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS topico_profile_after_auth_insert ON auth.users;
CREATE TRIGGER topico_profile_after_auth_insert AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.topico_provision_profile();
-- GoTrue puede insertar el contexto app_metadata después del INSERT, en el alta.
DROP TRIGGER IF EXISTS topico_profile_after_auth_context ON auth.users;
CREATE TRIGGER topico_profile_after_auth_context AFTER UPDATE OF raw_app_meta_data ON auth.users
  FOR EACH ROW WHEN ((OLD.raw_app_meta_data -> 'topico_provisioning') IS DISTINCT FROM
    (NEW.raw_app_meta_data -> 'topico_provisioning'))
  EXECUTE FUNCTION private.topico_provision_profile();
DROP TRIGGER IF EXISTS topico_profile_after_auth_email ON auth.users;
CREATE TRIGGER topico_profile_after_auth_email AFTER UPDATE OF email ON auth.users
  FOR EACH ROW WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION private.topico_mirror_auth_email();
DROP TRIGGER IF EXISTS topico_profile_email_guard ON public.perfiles;
CREATE TRIGGER topico_profile_email_guard BEFORE INSERT OR UPDATE OF email ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION private.topico_guard_profile_email();

CREATE OR REPLACE FUNCTION public.topico_user_consistency_ready() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT count(*)=4 FROM pg_catalog.pg_trigger t WHERE t.tgenabled IN ('O','A')
    AND ((t.tgrelid='auth.users'::regclass AND t.tgname='topico_profile_after_auth_insert'
        AND t.tgfoid='private.topico_provision_profile()'::regprocedure)
      OR (t.tgrelid='auth.users'::regclass AND t.tgname='topico_profile_after_auth_email'
        AND t.tgfoid='private.topico_mirror_auth_email()'::regprocedure)
      OR (t.tgrelid='auth.users'::regclass AND t.tgname='topico_profile_after_auth_context'
        AND t.tgfoid='private.topico_provision_profile()'::regprocedure)
      OR (t.tgrelid='public.perfiles'::regclass AND t.tgname='topico_profile_email_guard'
        AND t.tgfoid='private.topico_guard_profile_email()'::regprocedure))
$$;
REVOKE ALL ON FUNCTION public.topico_user_consistency_ready() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.topico_user_consistency_ready() TO service_role;
COMMIT;
