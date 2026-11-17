# Validación gratuita con Supabase local

No requiere branches ni otro proyecto cloud. Docker/CLI ejecutan PostgreSQL, Auth, PostgREST, Kong y correo de prueba en localhost. No se enlaza este entorno con el proyecto remoto.

## Entorno preparado el 16/11/2026

- Docker Desktop 29.9.1; Supabase CLI 2.121.0 ya instalados.
- Directorio aislado: `%TEMP%/topico-refactor-stack-20261116`.
- Configuración generada con `supabase init --workdir <directorio>`; proyecto local `topico-refactor-stack-20261116`.
- Primera migración local: esquema público sin filas, extraído del fixture de catálogo desde CREATE TYPE. No se copia el encabezado de Auth simulado: Auth lo proporciona el stack real.
- Segunda migración: copia de `supabase/migrations/20261116000100_secure_tenant_access.sql`.
- El esquema reproduce columnas/enums/restricciones y políticas legacy para probar su reemplazo. No reproduce todos los triggers originales ni configuración cloud de Auth, Storage, Edge Functions o Netlify.
- Servicios no necesarios excluidos del arranque: realtime, storage-api, imgproxy, postgres-meta, studio, edge-runtime, logflare, vector y supavisor.

## Ejecutar la matriz sin mostrar claves

Con el stack iniciado:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File supabase/tests/run-auth-api-local.ps1
```

El wrapper obtiene claves locales en memoria, el runner acepta exclusivamente HTTP loopback y rechaza redirects. No lee `.env.local`. Crea usuarios, instituciones y pacientes sintéticos; comprueba Auth y RLS por API y limpia exclusivamente los UUID generados aun ante fallo. Si falla la limpieza se informa también de ese error. No ejecutar el fixture SQL de PostgreSQL simulado sobre el stack real ni sobre producción.

Para reiniciar el mismo stack:

```powershell
supabase start --workdir "$env:TEMP/topico-refactor-stack-20261116" -x realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
```

El arranque/status puede imprimir claves locales: capturar su salida en un log temporal fuera del repo y no pegarla en conversación. Para detenerlo sin eliminar volúmenes:

```powershell
supabase stop --workdir "$env:TEMP/topico-refactor-stack-20261116"
```

No usar `--no-backup`, `db reset` ni `db push` contra un proyecto remoto. No sobrescribir migraciones ya aplicadas del stack para probar cambios nuevos; crear una migración local posterior o un entorno sintético nuevo identificado.

## Qué comprueba y qué falta

La prueba API valida registro administrativo sintético, login, perfiles de dos tenants, escritura propia, upsert, denegación de escalada de perfil, escritura cruzada y sesión de perfil inactivo. También prueba los SDK instalados con cookies en memoria: createBrowserClient, createServerClient, getUser, refreshSession y signOut. Complementa la matriz SQL de siete tablas ya existente.

No certifica cookies SSR de la aplicación, Server Actions a través de Next, navegación/PWA offline, migración Dexie instalada, carreras multiventana, configuración Auth cloud ni despliegue Netlify. Esos criterios siguen pendientes; no marcar producción como corregida solo por pasar estas pruebas locales.

## Matriz de consistencia de usuarios — fase 4b

El stack local incorpora también la migración en desarrollo 20261116000200_atomic_user_profiles.sql. Su borrador se corrigió y reaplicó exclusivamente en este entorno sintético antes del commit final; la copia temporal coincide con el archivo final del repositorio. Esto no autoriza modificar una migración publicada/aplicada en otros entornos. Para reproducir desde cero: esquema sintético, migración fase 2 y migración fase 4b, en ese orden, con Auth real del stack.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File supabase/tests/run-auth-api-local.ps1 -TestScript user-consistency-local.mjs
```

Requiere el contenedor local supabase_db_topico-refactor-stack-20261116, Docker en su ruta instalada y Mailpit en http://127.0.0.1:54324. El test acepta únicamente API HTTP loopback; no usar túneles ni redirigir puertos a producción. Instala y retira temporalmente un CHECK sintético en perfiles para provocar fallos de INSERT y espejo de email; por ello ejecutarlo solo en este stack aislado, sin otros tests simultáneos. No realiza esas operaciones mediante MCP remoto.

Valida aprovisionamiento atómico, marcador confiable, rollback sin huérfanos, email canónico, espejo transaccional, duplicados, permisos RPC y confirmación de email propio con los dos correos de Mailpit. Solo consulta cuerpos de mensajes dirigidos a los UUID sintéticos de su ejecución y mantiene enlaces/claves en memoria sin imprimirlos. Retira usuarios/perfiles/instituciones, constraint temporal y mensajes generados, e informa fallos de limpieza. Repetir también la matriz Auth/RLS original tras aplicar la migración.

## Fase 6 — frontera y páginas reales

Después de aplicar las migraciones anteriores y `20261117000200_sync_boundaries.sql` solo en el stack sintético local:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File supabase/tests/run-auth-api-local.ps1 -TestScript sync-api-local.mjs
```

Incluye la matriz Auth/RLS previa y crea 425 pacientes sintéticos adicionales en una institución nueva de la ejecución. Valida paginación real por timestamp/id, RPC de frontera, relojes no confiables, incremental posterior y escritor PostgreSQL que tarda en confirmar. Usa Docker local para el escritor y no ejecuta comandos del sistema a través de SQL. El wrapper mantiene claves solo en memoria. Cleanup elimina exclusivamente datos de las instituciones/cuentas sintéticas creadas por la ejecución. No ejecutar junto a tests que alteren triggers o restricciones.

La migración usa seis triggers de timestamp, un watermark privado y locks advisory de transacción (clave 726061706). No deshabilitarlos durante el test. La variante local final incluye backfill de timestamps nulos y NOT NULL; no crea creado_at en movimientos. Las consultas de la prueba verifican IDs completos, no solo HTTP 200.

Los tests del servicio (`src/core/db/sync/syncService.test.ts`) ejercitan errores y rollback de caché mediante mocks; no sustituyen la migración de IndexedDB instalada ni PWA/dos pestañas reales.

## Fase 7 — integridad y autoridad de stock

Aplicar `20261117000300_stock_integrity.sql` después de las migraciones anteriores, exclusivamente al stack sintético durante desarrollo. Es una migración de una sola aplicación; no repetirla sobre la misma base. No usar `db reset` ni modificar filas históricas para hacerla pasar. La aplicación nueva comprueba la presencia del RPC antes de comenzar PUSH; no publicar aisladamente sobre esquema antiguo.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File supabase/tests/run-stock-migration-local.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File supabase/tests/run-auth-api-local.ps1 -TestScript stock-api-local.mjs
```

El primer runner crea una base temporal con nombre aleatorio dentro del contenedor local y la retira al finalizar. Carga el fixture con Auth simulado, fases 2/6 y datos históricos sintéticos, luego aplica el SQL final de fase 7. Comprueba saldo de apertura, replay histórico sin efecto, reconstrucción apertura+eventos nuevos y grants por columna. La matriz API usa el stack con Auth/PostgREST real: relaciones entre tenants, cero/negativos/fracciones, alta de medicamento a cero, saldo absoluto denegado, replay de UUID, inmutabilidad, medidas, dos peticiones concurrentes, rollback de lote y snapshot aislado. Limpia únicamente instituciones/cuentas sintéticas de la ejecución. Repetir las matrices de usuarios y sincronización tras aplicar.

La cantidad mantiene enteros positivos en todas las medidas y máximo INT; sin conversiones ni nuevas fracciones. Cada INSERT nuevo de movimiento actualiza saldo en su misma transacción bajo lock del medicamento; upsert idéntico no repite efecto y una edición distinta del evento se rechaza. Las correcciones futuras requieren otro evento. El saldo anterior se captura sin recalcular historia en `private.stock_opening_balances`; los efectos posteriores quedan en `private.stock_applied_events`. Para medicamentos nuevos de cliente, apertura implícita cero. Las tablas privadas no están concedidas a clientes.

El RPC de lectura `topico_stock_snapshot` toma saldo e IDs aplicados en una misma sentencia MVCC. Dexie conserva metadata pendiente y reconstituye la proyección con eventos pending que aún no existen remotamente; failed conserva su fila y muestra saldo confirmado. Una modificación local o cambio de sesión durante la respuesta impide aplicarla. No cambia versión de Dexie ni cursores.

Antes de cualquier despliegue: pausar escritores antiguos y coordinar todos los dispositivos; resolver o aislar con evidencia sus colas legacy. Un movimiento pendiente anterior al corte puede tener su saldo ya reflejado por el cliente viejo: no deducirlo de fechas ni aplicarlo automáticamente sobre la apertura. Preservar cola y UUID hasta reconciliación dirigida. Los clientes antiguos que envíen stock absoluto serán rechazados; no reabrir grants para hacerlos funcionar. Revisar agregados de inconsistencias otra vez y duración de locks; si la migración rechaza datos, revierte completa y exige diagnóstico, sin reparación automática. Quedan pendientes navegación UI/PWA offline y dos pestañas reales de la aplicación.

## Fase 9 — rendimiento aislado

Con el stack sintético iniciado:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File supabase/tests/run-performance-local.ps1
```

Crea/retira una base `topico_perf_test_<uuid>` en el contenedor local fijo; no modifica la base postgres del stack Auth. Usa fixture y 100.000 pacientes sintéticos. Mide bajo authenticated/RLS, evalúa y descarta el índice compuesto, prueba retirada de dos índices duplicados, constraints, rollback/reaplicación y rechazo de deriva. No ejecutar fixtures, función de medición ni EXPLAIN ANALYZE en producción. Emite JSON por línea; conservar stdout en UTF-8 para actualizar evidencia. Ver [fase9-rendimiento.md](fase9-rendimiento.md).

## Fase 8 — funciones, sesiones y PWA en navegador real

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File supabase/tests/run-auth-api-local.ps1 -TestScript function-permissions-local.mjs
& 'C:/Program Files/nodejs/node.exe' --experimental-websocket scripts/privacy-browser-local.mjs
& 'C:/Program Files/nodejs/node.exe' --experimental-websocket scripts/pwa-session-local.mjs
```

El primer wrapper instala equivalentes sintéticos de helpers legacy solo cuando faltan y aplica la migración de fase 8 al contenedor local fijo. Comprueba ACL/search_path y que authenticated todavía puede actualizar filas con triggers pese a no poder ejecutar sus funciones directamente. Después verifica por Auth/API get_my_role activo/inactivo/eliminado y denegación del antiguo RPC de contraseña. Es repetible; no ejecutarlo contra cloud ni simultáneamente con pruebas que cambien funciones/triggers.

El harness de privacidad usa un origen HTTP loopback nuevo y un perfil temporal de Chrome propio, sin Supabase: IndexedDB real por cuenta, retención, bloqueo de handles, dos pestañas, conservación de base legacy, actualización v1→v4 y limpieza selectiva de Cache Storage. Usa el Chrome instalado y el WebSocket integrado de Node20; no instala Playwright ni dependencias. Solo cierra Chrome/servidor creados por el test; conserva el perfil sintético de TEMP.

El smoke PWA obtiene status/keys locales exclusivamente en memoria y rechaza destinos no loopback. Prepara cuentas/instituciones/paciente sintéticos con UUID nuevos; hace build con variables locales por proceso, inicia Next en un puerto libre y Chrome propio. Bloquea además Supabase cloud en el navegador. Comprueba HTTP 307/no-store, CSP Report-Only/receptor 204, login A, paciente UI, recarga offline desde SW, logout offline, pending conservado, B sin datos de A y regreso a A. Inspecciona claves de todas las cachés para rechazar HTML autenticado, RSC, Auth/API o cross-origin. Al terminar espera el cierre de sus procesos, retira únicamente sus fixtures y comprueba instituciones restantes. Ante error de limpieza falla el runner; no silencia el resultado ni borra datos ajenos.

`--skip-build` sirve únicamente para depurar el mismo build local ya generado. El comando normal siempre prepara el build local completo. Ningún runner modifica `.env.local`; tras usar el smoke PWA, ejecutar el build normal del proyecto antes de servir/publicar el artefacto habitual, pues `.next` corresponde a la configuración local de la prueba. No ejecutar dos builds/tests con mutaciones simultáneamente sobre el stack.

La instalación nueva prepara una base por cuenta al conectarse; conserva `TopicoDatabase` anterior sin adoptar pendientes. La recuperación de datos legacy necesita verificación de autoría/institución y corte de stock de fase 7. No limpiar esa base como parte del smoke, logout o rollback. Los tests usan datos sintéticos, no respaldos clínicos ni credenciales de producción.

Fuentes de configuración contrastadas: [next-pwa](https://ducanh-next-pwa.vercel.app/docs/next-pwa/configuring), [Workbox Build](https://developer.chrome.com/docs/workbox/modules/workbox-build), [Workbox Routing](https://developer.chrome.com/docs/workbox/modules/workbox-routing) y tipos del paquete instalado. La CSP sigue en observación, sin nonces ficticios ni enforcement. Su receptor almacena solo conteos por directiva en logs; no conserva informes completos. Ver estado-implementacion.md para pruebas efectivas, aceptación de despliegue y reversión.
