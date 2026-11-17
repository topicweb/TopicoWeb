$ErrorActionPreference = 'Stop'
$docker = 'C:/Program Files/Docker/Docker/resources/bin/docker.exe'
$container = 'supabase_db_topico-refactor-stack-20261116'
$database = 'topico_stock_test_' + [guid]::NewGuid().ToString('N')
$created = $false
try {
  & $docker exec $container createdb -U postgres $database
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear base sintetica' }
  $created = $true
  $sql = Get-Content -Raw (Join-Path $PSScriptRoot 'fixtures/schema.sql')
  $sql += Get-Content -Raw (Join-Path $PSScriptRoot '../migrations/20261116000100_secure_tenant_access.sql')
  $sql += Get-Content -Raw (Join-Path $PSScriptRoot '../migrations/20261117000200_sync_boundaries.sql')
  # Saldo historico independiente: no es correcto reconstruirlo sumando toda la historia.
  $sql += @'

INSERT INTO public.instituciones(id,nombre) VALUES ('77777777-7777-4777-8777-777777777777','Synthetic opening');
INSERT INTO public.medicamentos(id,business_id,nombre,stock_actual) VALUES
 ('77777777-7777-4777-8777-777777777771','77777777-7777-4777-8777-777777777777','Opening',12);
INSERT INTO public.movimientos_stock(id,business_id,medicamento_id,tipo,cantidad) VALUES
 ('77777777-7777-4777-8777-777777777772','77777777-7777-4777-8777-777777777777','77777777-7777-4777-8777-777777777771','ENTRADA',99);

'@
  $sql += Get-Content -Raw (Join-Path $PSScriptRoot '../migrations/20261117000300_stock_integrity.sql')
  $sql += @'

DO $$ BEGIN
 ASSERT (SELECT stock_actual=12 FROM public.medicamentos WHERE nombre='Opening');
 ASSERT (SELECT stock=12 FROM private.stock_opening_balances);
 ASSERT (SELECT count(*)=0 FROM private.stock_applied_events);
END $$;
-- Replay de historia ya confirmada no debe sumar de nuevo los 99.
UPDATE public.movimientos_stock SET cantidad=99 WHERE id='77777777-7777-4777-8777-777777777772';
INSERT INTO public.movimientos_stock(id,business_id,medicamento_id,tipo,cantidad) VALUES
 ('77777777-7777-4777-8777-777777777773','77777777-7777-4777-8777-777777777777','77777777-7777-4777-8777-777777777771','SALIDA',2);
DO $$ BEGIN
 ASSERT (SELECT stock_actual=10 FROM public.medicamentos WHERE nombre='Opening');
 ASSERT (SELECT sum(delta)=-2 FROM private.stock_applied_events);
 ASSERT (SELECT m.stock_actual=o.stock+COALESCE((SELECT sum(e.delta) FROM private.stock_applied_events e WHERE e.medicamento_id=m.id),0)
   FROM public.medicamentos m JOIN private.stock_opening_balances o ON o.medicamento_id=m.id);
 ASSERT NOT has_column_privilege('authenticated','public.medicamentos','stock_actual','UPDATE');
 ASSERT NOT has_column_privilege('authenticated','public.medicamentos','stock_actual','INSERT');
END $$;

'@
  $sql | & $docker exec -i $container psql -U postgres -d $database -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw 'Fallo migracion/saldo de apertura' }
  Write-Output 'Migracion fase 7: apertura, historia y reconstruccion correctas.'
} finally {
  if ($created -and $database -match '^topico_stock_test_[a-f0-9]{32}$') {
    & $docker exec $container dropdb -U postgres $database
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo retirar base sintetica' }
  }
}
