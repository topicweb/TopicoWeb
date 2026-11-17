$ErrorActionPreference = 'Stop'
$docker = 'C:/Program Files/Docker/Docker/resources/bin/docker.exe'
$container = 'supabase_db_topico-refactor-stack-20261116'
$database = 'topico_perf_test_' + [guid]::NewGuid().ToString('N')
$created = $false
try {
  & $docker exec $container createdb -U postgres $database
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear base sintetica' }
  $created = $true
  $sql = Get-Content -Raw (Join-Path $PSScriptRoot 'fixtures/schema.sql')
  foreach ($file in @('20261116000100_secure_tenant_access.sql','20261117000200_sync_boundaries.sql','20261117000300_stock_integrity.sql')) {
    $sql += Get-Content -Raw (Join-Path $PSScriptRoot "../migrations/$file")
  }
  $sql += Get-Content -Raw (Join-Path $PSScriptRoot 'performance-local.sql')
  $sql += Get-Content -Raw (Join-Path $PSScriptRoot 'duplicate-indexes-before.sql')
  $sql += Get-Content -Raw (Join-Path $PSScriptRoot '../migrations/20261117000500_remove_duplicate_indexes.sql')
  $sql += Get-Content -Raw (Join-Path $PSScriptRoot 'duplicate-indexes-after.sql')
  $sql += Get-Content -Raw (Join-Path $PSScriptRoot 'rollback-duplicate-indexes-local.sql')
  # Repetir tras rollback comprueba que ambos sentidos conservan las restricciones.
  $sql += Get-Content -Raw (Join-Path $PSScriptRoot '../migrations/20261117000500_remove_duplicate_indexes.sql')
  $sql += Get-Content -Raw (Join-Path $PSScriptRoot 'duplicate-indexes-after.sql')
  $sql | & $docker exec -i $container psql -X -q -A -t -U postgres -d $database -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw 'Fallo medicion sintetica de rendimiento' }
  # Drift deliberado: debe rechazar el indice que ahora tiene otras columnas.
  'CREATE INDEX idx_pacientes_business_dni ON public.pacientes(dni); CREATE INDEX idx_perfiles_email ON public.perfiles(email);' |
    & $docker exec -i $container psql -X -q -U postgres -d $database -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw 'Fallo preparacion drift sintetico' }
  $ErrorActionPreference = 'Continue'
  $rejected = Get-Content -Raw (Join-Path $PSScriptRoot '../migrations/20261117000500_remove_duplicate_indexes.sql') |
    & $docker exec -i $container psql -X -q -U postgres -d $database -v ON_ERROR_STOP=1 2>&1
  $rejectedCode = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
  if ($rejectedCode -eq 0 -or "$rejected" -notmatch 'Duplicate index precondition failed') { throw 'Drift no fue rechazado de forma prevista' }
  'DO $$ BEGIN ASSERT to_regclass(''public.idx_pacientes_business_dni'') IS NOT NULL; ASSERT to_regclass(''public.idx_perfiles_email'') IS NOT NULL; END $$;' |
    & $docker exec -i $container psql -X -q -U postgres -d $database -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw 'Drift elimino indices inesperadamente' }
  '{"label":"drift_rejected","preserved_both_indexes":true}'
} finally {
  if ($created -and $database -match '^topico_perf_test_[a-f0-9]{32}$') {
    & $docker exec $container dropdb -U postgres $database
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo retirar base sintetica' }
  }
}
