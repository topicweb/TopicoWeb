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
