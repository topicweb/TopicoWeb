param([int]$Port = 55439, [string]$PostgresBin = 'C:/Program Files/PostgreSQL/17/bin')
$ErrorActionPreference = 'Stop'
if ($Port -lt 1024 -or $Port -gt 65535) { throw 'Puerto local inválido' }
# Host deliberadamente fijo: este runner nunca acepta una URL remota o .env.
$testDatabase = 'topico_refactor_test_' + [guid]::NewGuid().ToString('N')
$connection = @('-h', '127.0.0.1', '-p', "$Port", '-U', 'postgres')
$migration = Join-Path $PSScriptRoot '../migrations/20261116000100_secure_tenant_access.sql'
$created = $false
try {
  & (Join-Path $PostgresBin 'createdb.exe') @connection $testDatabase
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear base sintética' }
  $created = $true
  & (Join-Path $PostgresBin 'psql.exe') @connection -d $testDatabase -v ON_ERROR_STOP=1 `
    -f (Join-Path $PSScriptRoot 'fixtures/schema.sql') -f $migration `
    -f (Join-Path $PSScriptRoot 'tenant_access.sql')
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron pruebas de acceso' }
  # La transición debe ser repetible y conservar exactamente el mismo contrato.
  & (Join-Path $PostgresBin 'psql.exe') @connection -d $testDatabase -v ON_ERROR_STOP=1 `
    -f $migration -f (Join-Path $PSScriptRoot 'tenant_access.sql')
  if ($LASTEXITCODE -ne 0) { throw 'Falló repetición de migración/pruebas' }
  Write-Output 'RLS local: contrato y repetición correctos.'
} finally {
  if ($created -and $testDatabase -match '^topico_refactor_test_[a-f0-9]{32}$') {
    & (Join-Path $PostgresBin 'dropdb.exe') @connection $testDatabase
    if ($LASTEXITCODE -ne 0) { Write-Warning "No se pudo retirar la base temporal $testDatabase" }
  }
}
