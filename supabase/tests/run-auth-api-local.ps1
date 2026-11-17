param(
  [string]$SupabaseCli = 'C:/Users/rival/AppData/Local/Programs/Supabase/supabase.exe',
  [string]$Node = 'C:/Program Files/nodejs/node.exe',
  [ValidateSet('auth-api-local.mjs','user-consistency-local.mjs','sync-api-local.mjs','stock-api-local.mjs')]
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
  $env:LOCAL_SUPABASE_URL = $localStatus.API_URL
  $env:LOCAL_SUPABASE_ANON_KEY = $localStatus.ANON_KEY
  $env:LOCAL_SUPABASE_SERVICE_ROLE_KEY = $localStatus.SERVICE_ROLE_KEY
  & $Node (Join-Path $PSScriptRoot $TestScript)
  if ($LASTEXITCODE -ne 0) { throw 'Falló la matriz Auth/API local' }
} finally {
  foreach ($name in $previous.Keys) { [Environment]::SetEnvironmentVariable($name,$previous[$name],'Process') }
}
