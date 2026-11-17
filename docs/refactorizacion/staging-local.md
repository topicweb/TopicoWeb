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
