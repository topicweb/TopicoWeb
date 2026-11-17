# Operational backup: PUBLIC tables only, encrypted for the current Windows user.
# Does not export Auth credentials/passwords, Storage files, or a complete schema.
$ErrorActionPreference = 'Stop'
$values = @{}
foreach ($line in Get-Content (Join-Path $PSScriptRoot '../.env.local')) {
  if ($line -match '^([A-Z0-9_]+)\s*=\s*(.*)$') {
    $values[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
  }
}
$origin = 'https://lyskgesbczpuihadaxbw.supabase.co'
if ($values['NEXT_PUBLIC_SUPABASE_URL'] -ne $origin) { throw 'Unexpected Supabase target' }
$serviceKey = $values['SUPABASE_SERVICE_ROLE_KEY']
if (-not $serviceKey) { throw 'Missing server key' }
$snapshot = [ordered]@{
  project_ref = 'lyskgesbczpuihadaxbw'
  captured_at = [DateTime]::UtcNow.ToString('o')
  kind = 'public_tables_before_release'
  tables = [ordered]@{}
}
foreach ($table in @('instituciones','perfiles','programas_estudio','pacientes','medicamentos','atenciones','movimientos_stock')) {
  # Explicit server UA: Windows PowerShell's default browser-like UA is rejected
  # by Supabase for secret keys. No browser or client receives this server key.
  try {
    $response = Invoke-WebRequest -UseBasicParsing -UserAgent 'TopicoWeb-Release/1.0 (server)' `
      -Uri ($origin + '/rest/v1/' + $table + '?select=*&limit=1000') `
      -Headers @{apikey=$serviceKey; Authorization=('Bearer '+$serviceKey); Prefer='count=exact'} -TimeoutSec 30
  } catch { throw "Backup HTTP failed for $table; no response body logged" }
  $parsed = ConvertFrom-Json -InputObject $response.Content
  $rows = @($parsed)
  $range = [string]$response.Headers['Content-Range']
  if ($range -notmatch '/(\d+)$' -or [int]$Matches[1] -ne $rows.Count) { throw "Incomplete backup: $table" }
  $snapshot.tables[$table] = $rows
}
Add-Type -AssemblyName System.Security
$json = $snapshot | ConvertTo-Json -Depth 100 -Compress
$plain = [Text.Encoding]::UTF8.GetBytes($json)
$scope = [Security.Cryptography.DataProtectionScope]::CurrentUser
$encrypted = [Security.Cryptography.ProtectedData]::Protect($plain,$null,$scope)
$backupDir = Join-Path $env:LOCALAPPDATA 'TopicoWeb/private-backups'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$backupPath = Join-Path $backupDir ('pre-release-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '-public.dpapi')
[IO.File]::WriteAllBytes($backupPath,$encrypted)
$decoded = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($backupPath),$null,$scope)
if ([Text.Encoding]::UTF8.GetString($decoded) -ne $json) { throw 'Encrypted backup verification failed' }
Write-Output "Verified encrypted PUBLIC backup: $backupPath"
foreach ($table in $snapshot.tables.Keys) { Write-Output "$table : $($snapshot.tables[$table].Count) rows" }
