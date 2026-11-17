param(
  [string]$SupabaseCli = 'C:/Users/rival/AppData/Local/Programs/Supabase/supabase.exe',
  [string]$Node = 'C:/Program Files/nodejs/node.exe',
  [ValidateSet('auth-api-local.mjs','user-consistency-local.mjs','sync-api-local.mjs','stock-api-local.mjs','function-permissions-local.mjs')]
  [string]$TestScript = 'auth-api-local.mjs'
)
$ErrorActionPreference = 'Stop'
$stackPath = Join-Path $env:TEMP 'topico-refactor-stack-20261116'
# Capturar status: contiene claves LOCALES que nunca se imprimen ni guardan en git.
$info = New-Object System.Diagnostics.ProcessStartInfo
$info.FileName = $SupabaseCli
$info.Arguments = "status --workdir `"$stackPath`" -o json"
$info.UseShellExecute = $false
$info.CreateNoWindow = $true
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
$process = [System.Diagnostics.Process]::Start($info)
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$process.WaitForExit()
if ($process.ExitCode -ne 0) { throw 'Supabase local no está listo' }
$localStatus = $stdout.Result | ConvertFrom-Json
$process.Dispose()
$previous = @{}
foreach ($name in @('LOCAL_SUPABASE_URL','LOCAL_SUPABASE_ANON_KEY','LOCAL_SUPABASE_SERVICE_ROLE_KEY')) {
  $previous[$name] = [Environment]::GetEnvironmentVariable($name,'Process')
}
try {
  if ($TestScript -eq 'function-permissions-local.mjs') {
    # En un stack sin las funciones legacy, instalar equivalentes sintéticos
    # antes de la migración. Nunca reemplazan implementaciones ya existentes.
    $docker = 'C:/Program Files/Docker/Docker/resources/bin/docker.exe'
    $container = 'supabase_db_topico-refactor-stack-20261116'
    $bootstrap = @'
DO $bootstrap$
BEGIN
 IF to_regprocedure('public.get_my_role()') IS NULL THEN
  EXECUTE $fn$CREATE FUNCTION public.get_my_role() RETURNS public.rol_usuario LANGUAGE sql STABLE SECURITY DEFINER AS
   'SELECT p.rol FROM public.perfiles p WHERE p.id=(SELECT auth.uid())'$fn$;
 END IF;
 IF to_regprocedure('public.handle_new_user()') IS NULL THEN
  EXECUTE $fn$CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS 'BEGIN RETURN NEW; END'$fn$;
 END IF;
 IF to_regprocedure('public.validate_user_business_id()') IS NULL THEN
  EXECUTE $fn$CREATE FUNCTION public.validate_user_business_id() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS 'BEGIN RETURN NEW; END'$fn$;
 END IF;
 IF to_regprocedure('public.validate_password_strength(text)') IS NULL THEN
  EXECUTE $fn$CREATE FUNCTION public.validate_password_strength(password_text text) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS 'SELECT password_text ~ ''[A-Z]'' AND password_text ~ ''[a-z]'' AND password_text ~ ''[0-9]'' AND length(password_text)>=8'$fn$;
 END IF;
 IF to_regprocedure('public.moddatetime()') IS NULL THEN
  EXECUTE $fn$CREATE FUNCTION public.moddatetime() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN NEW.actualizado_at=pg_catalog.now(); RETURN NEW; END'$fn$;
 END IF;
 IF to_regprocedure('public.update_actualizado_at_column()') IS NULL THEN
  EXECUTE $fn$CREATE FUNCTION public.update_actualizado_at_column() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN NEW.actualizado_at=pg_catalog.now(); RETURN NEW; END'$fn$;
 END IF;
END
$bootstrap$;
'@
    $migration = Get-Content -Raw (Join-Path $PSScriptRoot '../migrations/20261117000400_function_permissions.sql')
    $assertions = @'
DO $assertions$
DECLARE t timestamptz;
BEGIN
 ASSERT to_regprocedure('public.get_my_role()') IS NOT NULL;
 ASSERT to_regprocedure('public.handle_new_user()') IS NOT NULL;
 ASSERT to_regprocedure('public.validate_user_business_id()') IS NOT NULL;
 ASSERT to_regprocedure('public.validate_password_strength(text)') IS NOT NULL;
 ASSERT to_regprocedure('public.moddatetime()') IS NOT NULL;
 ASSERT to_regprocedure('public.update_actualizado_at_column()') IS NOT NULL;
 ASSERT NOT has_function_privilege('anon','public.handle_new_user()','EXECUTE');
 ASSERT NOT has_function_privilege('authenticated','public.handle_new_user()','EXECUTE');
 ASSERT NOT has_function_privilege('service_role','public.handle_new_user()','EXECUTE');
 ASSERT NOT has_function_privilege('anon','public.validate_user_business_id()','EXECUTE');
 ASSERT NOT has_function_privilege('authenticated','public.validate_user_business_id()','EXECUTE');
 ASSERT NOT has_function_privilege('service_role','public.validate_user_business_id()','EXECUTE');
 ASSERT NOT has_function_privilege('anon','public.validate_password_strength(text)','EXECUTE');
 ASSERT NOT has_function_privilege('authenticated','public.validate_password_strength(text)','EXECUTE');
 ASSERT NOT has_function_privilege('service_role','public.validate_password_strength(text)','EXECUTE');
 ASSERT NOT has_function_privilege('anon','public.moddatetime()','EXECUTE');
 ASSERT NOT has_function_privilege('authenticated','public.moddatetime()','EXECUTE');
 ASSERT NOT has_function_privilege('service_role','public.moddatetime()','EXECUTE');
 ASSERT NOT has_function_privilege('anon','public.update_actualizado_at_column()','EXECUTE');
 ASSERT NOT has_function_privilege('authenticated','public.update_actualizado_at_column()','EXECUTE');
 ASSERT NOT has_function_privilege('service_role','public.update_actualizado_at_column()','EXECUTE');
 ASSERT has_function_privilege('authenticated','public.get_my_role()','EXECUTE');
 ASSERT NOT has_function_privilege('anon','public.get_my_role()','EXECUTE');
 ASSERT NOT has_function_privilege('service_role','public.get_my_role()','EXECUTE');
 ASSERT (SELECT p.proconfig @> ARRAY['search_path=""'] FROM pg_proc p WHERE p.oid='public.get_my_role()'::regprocedure);
 ASSERT (SELECT p.proconfig @> ARRAY['search_path=""'] FROM pg_proc p WHERE p.oid='public.handle_new_user()'::regprocedure);
 ASSERT (SELECT p.proconfig @> ARRAY['search_path=""'] FROM pg_proc p WHERE p.oid='public.validate_user_business_id()'::regprocedure);
 ASSERT (SELECT p.proconfig @> ARRAY['search_path=""'] FROM pg_proc p WHERE p.oid='public.validate_password_strength(text)'::regprocedure);
 ASSERT (SELECT p.proconfig @> ARRAY['search_path=""'] FROM pg_proc p WHERE p.oid='public.moddatetime()'::regprocedure);
 ASSERT (SELECT p.proconfig @> ARRAY['search_path=""'] FROM pg_proc p WHERE p.oid='public.update_actualizado_at_column()'::regprocedure);
END
$assertions$;
CREATE TEMP TABLE function_timestamp_probe(actualizado_at timestamptz NOT NULL);
CREATE TRIGGER function_timestamp_update BEFORE UPDATE ON function_timestamp_probe
 FOR EACH ROW EXECUTE FUNCTION public.update_actualizado_at_column();
INSERT INTO function_timestamp_probe VALUES ('2000-01-01 UTC');
GRANT SELECT,UPDATE ON function_timestamp_probe TO authenticated;
SET ROLE authenticated;
UPDATE function_timestamp_probe SET actualizado_at='2001-01-01 UTC';
RESET ROLE;
DO $timestamp$
BEGIN
 ASSERT (SELECT actualizado_at > '2001-01-01 UTC'::timestamptz FROM function_timestamp_probe);
END
$timestamp$;
DROP TRIGGER function_timestamp_update ON function_timestamp_probe;
CREATE TRIGGER function_timestamp_moddatetime BEFORE UPDATE ON function_timestamp_probe
 FOR EACH ROW EXECUTE FUNCTION public.moddatetime('actualizado_at');
SET ROLE authenticated;
UPDATE function_timestamp_probe SET actualizado_at='2001-01-01 UTC';
RESET ROLE;
DO $timestamp$
BEGIN
 ASSERT (SELECT actualizado_at > '2001-01-01 UTC'::timestamptz FROM function_timestamp_probe);
END
$timestamp$;
'@
    $sql = $bootstrap + "`n" + $migration + "`n" + $assertions
    $sql | & $docker exec -i $container psql -U postgres -d postgres -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw 'Fallaron ACL, search_path o triggers de funciones' }
  }
  $env:LOCAL_SUPABASE_URL = $localStatus.API_URL
  $env:LOCAL_SUPABASE_ANON_KEY = $localStatus.ANON_KEY
  $env:LOCAL_SUPABASE_SERVICE_ROLE_KEY = $localStatus.SERVICE_ROLE_KEY
  & $Node (Join-Path $PSScriptRoot $TestScript)
  if ($LASTEXITCODE -ne 0) { throw 'Falló la matriz Auth/API local' }
} finally {
  foreach ($name in $previous.Keys) { [Environment]::SetEnvironmentVariable($name,$previous[$name],'Process') }
}
