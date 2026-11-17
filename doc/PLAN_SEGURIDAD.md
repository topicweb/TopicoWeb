# 🛡️ PLAN DE SEGURIDAD — Análisis de Vulnerabilidades y Plan de Remediación

> **Fecha del análisis:** 06/11/2026
> **Alcance:** `src/core/` + puntos de dependencia directa (`middleware.ts`, server actions de usuarios, migraciones SQL, configuración Next.js).
> **Estado:** 🟡 Pendiente de implementación
> **Propósito:** Documento de contexto para ejecutar los fixes de forma incremental sin perder el porqué de cada cambio.
>
> **🔄 Re-auditoría 07/11/2026:** se verificó cada hallazgo contra el código real. Resultado: 12 confirmados, 1 confirmado parcialmente (R6), 1 falso positivo parcial (R6–softDelete), 1 es código muerto mayormente (R4–seedData) y se **añaden 4 hallazgos nuevos (R16–R19)**. El detalle paso a paso de cada corrección está en `doc/PLAN_CORRECTIVO_SEGURIDAD.md`.

---

## ✅ Resultado de la re-auditoría (07/11/2026)

| # | Veredicto | Comentario |
|---|-----------|------------|
| R1 | ✅ Confirmado (crítico) | `users.ts:49-57` devuelve `rol:'admin'` al `catch` de "No autenticado". Explotable desde cualquier cliente sin sesión. |
| R2 | ✅ Confirmado (crítico) | Solo hay 1 migración en `supabase/migrations/` (columna `diagnostico`). Ninguna política RLS versionada. La política del doc está mal. |
| R3 | ✅ Confirmado (alto) | `middleware.ts` solo hace `getUser()` para renovar cookies (línea 27), sin redirecciones. El guard real es un `useEffect` en `(dashboard)/layout.tsx:23-27`. `role` proviene de Dexie (`AuthProvider.tsx:82-88`). |
| R4 | ✅ Confirmado | `syncService.ts:129` hace `select('*')` sin filtro. **Matiz:** `seedData.ts` es código muerto (comprobado — `seedDatabase` no se invoca desde ningún archivo), así que su riesgo es latente, no activo. Recomendación añadida: eliminarlo o arreglarlo. |
| R5 | ✅ Confirmado | `upsertAndMarkSynced` (líneas 335-344) y `resolveConflict` (líneas 460-487) suben `business_id` tal cual vive en IndexedDB, editable con DevTools. |
| R6 | ⚠️ Parcial | **updateUserAction: CONFIRMADO (IDOR real).** Valida el rol del caller contra su propio tenant, pero el `UPDATE` va sobre `.eq('id', id)` sin comprobar el tenant del objetivo → un admin del tenant A puede cambiar `rol`/`email`/`nombre` (e incluso promover a `admin`) de usuarios del tenant B. **softDeleteUserAction: FALSO POSITIVO.** Consulta el `business_id` del objetivo y valida al caller contra *ese* tenant (líneas 193-204): un admin ajeno no pasa la validación. No tocar su lógica de validación. |
| R7 | ✅ Confirmado | `admin.ts` no importa `server-only`; el paquete ni siquiera está en `package.json`. |
| R8 | ✅ Confirmado | `createUserAction` solo exige presencia de email/password; sin longitud, complejidad ni rate limit. `zod` ya está en dependencias. |
| R9 | ✅ Confirmado | `users.ts:181` copia `data.business_id` al `updatePayload`. |
| R10 | ✅ Confirmado | `logger.ts` imprime todos los `...args` en producción. |
| R11 | ✅ Confirmado | `next.config.ts` no define `headers()`. |
| R12 | ✅ Confirmado | `AuthProvider.tsx:41-68` no elimina la clave legacy tras `setSession`. |
| R13 | ✅ Confirmado (bajo) | `deviceId.ts:20` lee/escribe `localStorage`, spoofable. Impacto limitado a `sync_metadata`. |
| R14 | ✅ Confirmado (bajo) | `(db as any)[tableName]` en `syncService.ts:193,376,461` y `useSimpleSync.ts:43`. |
| R15 | ✅ Confirmado (bajo) | `console.*` directo en `useSimpleSync.ts:79-96`, `deviceId.ts:29,38,48`, `SyncMonitor.tsx:42`, `seedData.ts` (todo el archivo) y `syncService.ts:217`. |
| R16 | 🆕 Nuevo (medio) | Push de `instituciones` completo por cualquier cliente ver la sección nueva. |
| R17 | 🆕 Nuevo (medio) | Cambio de email del perfil sin actualizar/corregir el email de Auth — desincronización de identidad. |
| R18 | 🆕 Nuevo (bajo) | Falta de límites en payloads (`rol` acepta cualquier string). |
| R19 | 🆕 Nuevo (informativo) | Datos sensibles replicados en IndexedDB (norma del diseño offline-first; revisar borrado en `signOut`). |

---

## 📌 Resumen ejecutivo

Se identificaron **15 hallazgos**: 2 críticos, 4 altos, 5 medios y 4 bajos.

| # | Severidad | Hallazgo | Ubicación | Dificultad | Fase |
|---|-----------|----------|-----------|------------|------|
| R1 | 🔴 Crítico | Fallback que otorga rol `admin` sin sesión | `features/usuarios/actions/users.ts:49-57` | 🟢 Baja* | 1 |
| R2 | 🔴 Crítico | RLS sin versionar en el repo (y política documentada mal) | `supabase/migrations/` | 🔴 Alta | 3 |
| R3 | 🟠 Alto | Autorización solo client-side (guard en `useEffect`) | `middleware.ts`, `(dashboard)/layout.tsx` | 🟡 Media | 2 |
| R4 | 🟠 Alto | Fuga cross-tenant en PULL de `instituciones` | `core/db/sync/syncService.ts:129` | 🟡 Media | 3 |
| R5 | 🟠 Alto | PUSH con `business_id` controlado por el cliente | `syncService.ts:344`, `useSimpleSync.ts:76` | 🔴 Alta | 3 |
| R6 | 🟠 Alto | IDOR: admin puede modificar usuarios de otro tenant | `users.ts:174-184` | 🟢 Baja | 1 |
| R7 | 🟡 Medio | `admin.ts` sin guardia `server-only` | `core/db/supabase/admin.ts` | 🟢 Baja | 1 |
| R8 | 🟡 Medio | Sin política de contraseñas ni rate limit | `users.ts:60-81` | 🟢 Baja | 1 |
| R9 | 🟡 Medio | `updateUserAction` permite mover usuarios entre tenants | `users.ts:181` | 🟢 Baja | 1 |
| R10 | 🟡 Medio | Logger filtra objetos de error completos en producción | `core/utils/logger.ts:30-40` | 🟢 Baja | 1 |
| R11 | 🟡 Medio | Sin cabeceras de seguridad (CSP, X-Frame-Options, HSTS) | `next.config.ts` | 🟡 Media | 2 |
| R12 | 🔵 Bajo | Tokens legacy en `localStorage` sin purga posterior | `AuthProvider.tsx:41-68` | 🟢 Baja | 2 |
| R13 | 🔵 Bajo | `deviceId` spoofable en `localStorage` | `core/utils/deviceId.ts:20` | 🟢 Baja | — |
| R14 | 🔵 Bajo | Acceso dinámico `(db as any)[tableName]` | `syncService.ts:193,376` | 🟢 Baja | 2 |
| R15 | 🔵 Bajo | `console.warn/error` directo fuera del logger | `useSimpleSync.ts:79,88` | 🟢 Baja | 1 |

> \* Baja en dificultad de código, **pero con riesgo funcional a verificar** (ver detalle de R1: el fallback se agregó a propósito en el commit `fb5b260` para tapar un bug de cookies).

### Lo que ya está bien (no tocar)
- ✅ `.env.local` no está trackeado ni en el historial de git (verificado con `git log --all`).
- ✅ `supabaseAdmin` no se re-exporta desde `@core/db/index` ni `supabase/index`.
- ✅ `getAuthenticatedUser()` usa `auth.getUser()` (valida con el servidor) y no `getSession()`.
- ✅ Sin `dangerouslySetInnerHTML`, `eval`, `innerHTML` ni `new Function` en todo `src/`.
- ✅ Login exige conexión online (commit `bafa975`), lo que mitiga parcialmente el R1.
- ✅ Separación correcta de clientes Supabase: `client.ts` (anon), `server.ts` (cookies), `admin.ts` (service role).

---

# 🟢 FASE 1 — Fixes de bajo riesgo (prioridad: HOY)

**Objetivo:** cerrar los vectores explotables sin cambiar comportamiento para usuarios legítimos.
**Esfuerzo estimado:** 2-4 horas. **Riesgo funcional:** bajo.

## R1 — Fallback que inventa un admin sin sesión 🔴

**Archivo:** `src/features/usuarios/actions/users.ts:49-57`

```ts
} catch (err: any) {
  if (err.message === 'No autenticado') {
    // ❌ devuelve admin en falso
    return { rol: 'admin', business_id: businessId, activo: true };
  }
```

**Problema:** cuando `getAuthenticatedUser()` lanza `No autenticado`, la validación **no falla**: devuelve un admin ficticio. Las Server Actions de Next son endpoints POST invocables desde cualquier cliente (los action IDs se extraen del JS compilado), así que un atacante **sin sesión** puede:
- `createUserAction` → crear cuentas en Supabase Auth con `rol: 'admin'` en cualquier tenant (con `email_confirm: true`).
- `updateUserAction` → cambiar `rol` y `business_id` de cualquier usuario.
- `softDeleteUserAction` → desactivar cualquier usuario.

Lo irónico: estar **logueado** como no-admin sí bloquea (línea 39), pero estar **deslogueado** otorga admin.

**⚠️ Contexto histórico (importante):** el fallback se agregó a propósito en el commit `fb5b260` (15/08/2026) para cubrir el caso "cookie de sesión ausente en el servidor (PWA/Offline o cliente SPA con sesión local)". **No se debe quitar a ciegas.**

**Por qué probablemente ya no hace falta ese fallback:**
1. `login/page.tsx:24` exige online para iniciar sesión.
2. El login usa `createBrowserClient` → la sesión **sí vive en cookies**.
3. `middleware.ts` renueva la sesión en todas las rutas, incluidos los POST de server actions.
4. La migración de sesión legacy (`AuthProvider.tsx:41`) escribe cookies vía `setSession`.

**Solución:**
1. *(Pre-check)* Agregar un log temporal en el `catch` que registre si la ausencia de cookie ocurre con sesión normal en producción. Probar los 3 flujos admin (crear, editar, desactivar usuario) durante unos días.
2. Eliminar el `catch` completo: que el error `No autenticado` se propague.
3. En `updateUserAction` (línea 145-151), eliminar el `try/catch` que deja `currentUserId = null` — hoy eso hace que un sin-sesión caiga directo al path admin (es la otra mitad del exploit).
4. En el frontend, mostrar un toast claro "Sesión expirada, inicie sesión nuevamente" cuando la action lance `No autenticado` (hoy `UserModal.tsx:87` solo hace `console.error` y el usuario no ve nada).

**Dificultad:** 🟢 Baja en código (~15 líneas) | **Riesgo:** 🟡 solo si alguna flow legítimo dependa del fallback → mitigado con el pre-check.

**Verificación:**
- [ ] Con sesión admin: crear / editar / desactivar usuario → funciona igual.
- [ ] Sin sesión (curl o modo incógnito invocando la action) → rechaza.
- [ ] Con sesión no-admin → rechaza (esto ya funcionaba).

---

## R6 — IDOR: verificar tenant del usuario objetivo 🟠

**Archivo:** `users.ts:174-184`

**Problema:** `updateUserAction` valida que el caller sea admin de *su* tenant, pero el `UPDATE` va sobre `.eq('id', id)` **sin verificar que el usuario objetivo pertenezca al mismo tenant**. Un admin del tenant A puede modificar (rol, email, nombre) a cualquier usuario del tenant B.

⚠️ **Corrección de la re-auditoría:** la afirmación sobre `softDeleteUserAction` (líneas 193-204) era **falso positivo** — consulta el `business_id` del objetivo y valida al caller contra *ese* tenant, así que un admin ajeno no pasa la validación. **No cambiar su lógica de validación.**

**Solución:** antes del update en `updateUserAction`, consultar el perfil destino y exigir:
```ts
if (targetUser.business_id !== perfil.business_id) {
  throw new Error('No tienes permiso para operar sobre este usuario');
}
```

**Dificultad:** 🟢 Baja (2 queries extra) | **Riesgo:** 🟢 Nulo en el flujo happy-path.

---

## R7 — `server-only` en `admin.ts` 🟡

**Archivo:** `src/core/db/supabase/admin.ts`

**Problema:** la service role key solo está protegida porque *hoy* la importa un archivo `"use server"`. No hay barrera mecánica: si alguien la importa en un componente cliente, no habrá error de build y la key podría filtrarse al bundle.

**Solución:** agregar `import 'server-only';` como primera línea + instalar el paquete `server-only`.

**Dificultad:** 🟢 Trivial | **Riesgo:** 🟢 Nulo (falla en build, que es justo lo deseado).

---

## R8 — Política de contraseñas 🟡

**Archivo:** `users.ts:60-64`

**Problema:** `createUserAction` acepta cualquier `password` sin longitud ni complejidad, con `email_confirm: true` y sin rate limit.

**Solución:**
- Validación con Zod en la action: mínimo 8 caracteres, al menos una mayúscula y un número (o la política que definan).
- Validación espejo en `UserModal.tsx` para feedback inmediato.
- *(Opcional, Fase 2)* Rate limit simple por IP/acción en el server action.

**Dificultad:** 🟢 Baja | **Riesgo:** 🟢 Nulo (solo afecta contraseñas débiles nuevas).

---

## R9 — Cambio de `business_id` sin restricción 🟡

**Archivo:** `users.ts:181`

**Problema:** un admin puede cambiar el `business_id` de otro usuario (`updatePayload.business_id = data.business_id`), transfiriendo cuentas entre instituciones sin control. El hook `useUsuarios.ts:65` siempre manda el propio `business_id`, así que **nadie lo usa legítimamente**.

**Solución:** eliminar `data.business_id` del `updatePayload` (mantenerlo solo como parámetro de validación del tenant).

**Dificultad:** 🟢 Trivial | **Riesgo:** 🟢 Nulo.

---

## R10 — Logger filtra objetos completos en producción 🟡

**Archivo:** `core/utils/logger.ts:30-40`

**Problema:** en producción imprime `warn`/`error` con todos sus argumentos. Los objetos de error de Supabase (que aparecen por montón desde `syncService`) incluyen `details`/`hint` que pueden contener datos sensibles en la consola del navegador.

**Solución:** sanitizar en producción: loguear solo `message` (y `code` si existe) de errores; en dev mantener los objetos completos.

**Dificultad:** 🟢 Baja | **Riesgo:** 🟢 Nulo (solo cambia qué se imprime).

---

## R15 — `console.*` directo fuera del logger 🔵

**Archivo:** `useSimpleSync.ts:79,88` (y `deviceId.ts`, `retry.ts`)

**Solución:** reemplazar por `logger.warn/logger.error`. Coherencia + hereda el sanitizado de R10.

**Dificultad:** 🟢 Trivial | **Riesgo:** 🟢 Nulo.

---

## ✅ Checklist Fase 1

- [x] R1: eliminar fallback admin + quitar try/catch de `currentUserId` en `updateUserAction` ✅ 08/11/2026 (se omitió el pre-check por decisión del usuario — fallback eliminado de una vez)
- [x] R1: toast de "sesión expirada" en `UserModal`/`useUsuarios` ✅ 08/11/2026
- [ ] R6: validar tenant del usuario objetivo en update y soft-delete
- [ ] R7: `import 'server-only'` en `admin.ts`
- [ ] R8: validación de contraseña (Zod server + client)
- [ ] R9: quitar `business_id` del `updatePayload`
- [ ] R10: sanitizar logger en producción
- [ ] R15: migrar `console.*` a `logger`
- [ ] **Tests:** crear `users.test.ts` con `getAuthenticatedUser` mockeado:
  sin sesión → lanza / no-admin → lanza / admin-ok → pasa / admin de otro tenant → lanza
- [ ] `npx tsc --noEmit` + `npx vitest run` + smoke test manual de gestión de usuarios

---

# 🟡 FASE 2 — Defensa en profundidad (esta semana)

**Objetivo:** que un fallo en una capa no signifique acceso total.
**Esfuerzo estimado:** ~½ día. **Riesgo funcional:** medio (cuidado con CSP y el matcher).

## R3 — Protección de rutas solo client-side 🟠

**Archivos:** `src/middleware.ts:26-29`, `src/app/(dashboard)/layout.tsx:22-27`

**Problema:**
- El middleware solo renueva la sesión; **no valida ni redirige**. Cualquier ruta es accesible sin sesión desde el punto de vista del servidor.
- El guard real es un `useEffect` + `router.replace` en el cliente → evadible.
- `role` y `businessId` se leen de **Dexie/IndexedDB** (`AuthProvider.tsx:82-88`), editable con DevTools → cualquier usuario se declara `admin` localmente (así funciona `canDelete` en `patients/page.tsx:22`).

**Solución:**
1. En el middleware: si no hay sesión válida y la ruta está protegida → `NextResponse.redirect(new URL('/login', request.url))`.
2. Excluir explícitamente `/login`, `/` y assets del matcher (ya se excluyen estáticos).
3. Mantener el guard del layout como UX (feedback de carga), no como seguridad.
4. **Contexto offline:** el SW sirve desde cache sin pasar por el middleware, así que el modo offline no se rompe. Verificar igual la navegación offline del PWA.

**Dificultad:** 🟡 Media | **Riesgo:** 🟡 redirect loops o rutas rotas si el matcher queda mal → probar login, dashboard, assets, y navegación offline.

---

## R11 — Sin cabeceras de seguridad 🟡

**Archivo:** `next.config.ts` (hoy sin `headers()`)

**Solución (en orden, no todas de golpe):**
1. `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`.
2. CSP **en modo report-only primero** (`Content-Security-Policy-Report-Only`) durante unos días, recopilar reportes y luego activarla. Un CSP agresivo mal hecho rompe Supabase/PWA de formas difíciles de depurar.

**Dificultad:** 🟡 Media (la CSP) | **Riesgo:** 🟡 medio si se salta el modo report-only.

---

## R12 — Tokens legacy en `localStorage` 🔵

**Archivo:** `AuthProvider.tsx:41-68` (`migrateLegacyLocalStorageSession`)

**Problema:** migra tokens desde `localStorage` (`sb-*-auth-token`), donde cualquier XSS los roba. Es solo una migración, pero la clave legacy **nunca se purga**.

**Solución:** tras un `setSession` exitoso, `localStorage.removeItem(storageKey)` y retirar la función completa cuando nadie necesite la migración (estamos en Nov/2026; la migración es de agosto).

**Dificultad:** 🟢 Baja | **Riesgo:** 🟢 Nulo.

---

## R14 — `(db as any)[tableName]` 🔵

**Archivo:** `syncService.ts:193,376`

**Solución:** tipar con un `Record<string, EntityTable<...>>` o un helper `getTable(name)` que lance error claro si la tabla no existe. Evita fallos silenciosos en runtime.

**Dificultad:** 🟢 Baja | **Riesgo:** 🟢 Nulo.

---

## ✅ Checklist Fase 2

- [ ] R3: redirección server-side en middleware + probar login/dashboard/offline
- [ ] R11: cabeceras básicas → luego CSP report-only → luego CSP activa
- [ ] R12: purgar clave legacy de `localStorage` tras migrar
- [ ] R14: tipar acceso dinámico a tablas Dexie
- [ ] Smoke test: PWA instalada, login, dashboard, logout, navegación offline

---

# 🔴 FASE 3 — Aislamiento de tenants / RLS (requiere staging)

**Objetivo:** que la base de datos sea la última línea de defensa real (hoy es la única, pero no está verificable desde el repo).
**Esfuerzo estimado:** 1-2 días **en staging**. **Riesgo funcional:** ALTO si se hace mal.

## R2 — RLS sin versionar en el repo 🔴

**Situación:** `supabase/migrations/` contiene **1 sola migración** (agregar columna `diagnostico`). No hay ningún SQL de políticas RLS en el repo, a pesar de que `doc/implementation_plan.md:53` marca "FIX RLS Policies" como hecho. **No es posible verificar desde el código si RLS está activo en producción.**

**Peor:** la política sugerida en `doc/implementation_plan.md:317` está **mal**:
```sql
USING (business_id = auth.uid())  -- ❌ compara ID de institución con ID de usuario → nunca coincide
```

**Solución (secuencia obligatoria):**
1. **Exportar el estado actual:** `SELECT * FROM pg_policies;` desde el dashboard/CLI de Supabase. Guardarlo como migración inicial en el repo.
2. **Auditar** que cubra las 7 tablas que toca el sync: `instituciones`, `perfiles`, `programas_estudio`, `pacientes`, `medicamentos`, `atenciones`, `movimientos_stock`.
3. **Corregir la condición** — la forma correcta es:
   ```sql
   CREATE POLICY "tenant_isolation" ON public.pacientes
   FOR ALL USING (
     business_id IN (SELECT business_id FROM public.perfiles WHERE id = auth.uid())
   );
   ```
   - `perfiles`: política especial — el usuario debe poder leer **su propio perfil** (`id = auth.uid()`) además de los de su tenant.
   - `instituciones`: el usuario debe ver **solo la suya** (`id = (SELECT business_id FROM perfiles WHERE id = auth.uid())`).
4. **Versionar todo** como migración SQL en `supabase/migrations/` para que el estado sea reproducible.
5. **Probar la matriz completa en staging** (ver abajo).

**Por qué es el más delicado:** toda la app escribe desde el navegador con la anon key. Si una política queda mal, el síntoma **no es un error visible**: el PULL/PUSH falla silenciosamente (`syncService.ts:160` hace `logger.error` + `continue`) y los usuarios ven "datos que no aparecen".

**Lo que NO se toca:** `supabaseAdmin` bypasea RLS → la gestión de usuarios (Fase 1) queda intacta.

**Dificultad:** 🔴 Alta (7 tablas × SELECT/INSERT/UPDATE/DELETE + casos especiales) | **Riesgo:** 🔴 alto → controlado con staging.

### Matriz de prueba obligatoria (staging)
- [ ] Login → PULL completo → datos visibles en dashboard.
- [ ] Crear paciente offline → volver online → PUSH → visible desde otra cuenta **del mismo tenant**.
- [ ] **Cuenta de otro tenant NO ve** los pacientes/atenciones del primero (ni por UUID directo en la URL de la API).
- [ ] Lectura de `perfiles`: cada usuario ve los de su tenant; su propio perfil siempre.
- [ ] `instituciones`: solo la propia.
- [ ] Server actions (crear/editar usuario) siguen funcionando (bypasean RLS).

---

## R4 — PULL de `instituciones` sin filtro 🟠

**Archivo:** `syncService.ts:129`

```ts
const result = await supabase.from('instituciones').select('*'); // ❌ todas, sin filtro
```

Descarga **todas las instituciones** sin filtro de tenant (el resto de tablas sí filtra por `business_id`). Con una anon key, un usuario autenticado podría leer el listado completo de instituciones si su política es permisiva.

**Nota de re-auditoría:** `seedData.ts` es **código muerto** (comprobado el 07/11/2026 — `seedDatabase` no se invoca desde ningún archivo activo). Su riesgo es latente; se recomienda eliminarlo o repararlo (ver R4.2 en el plan correctivo).

**Relacionado:** `seedData.ts:22` toma `select('id').limit(1).single()` → **cualquier** institución remota y la usa como `currentBusinessId` del usuario.

**Solución:**
1. Filtrar en el PULL: `.eq('id', businessId)` (solo se necesita la propia).
2. En `seedData`, buscar la institución **del perfil del usuario**, no la primera que aparezca.
3. Y sobre todo: la política RLS de `instituciones` (R2) — el filtro del cliente es UX, la seguridad la da la BD.

**Dificultad:** 🟡 Media | **Riesgo:** 🟡 medio — si algún flujo dependía de tener todas las instituciones localmente (revisar `usePacientes`/selectores antes de cambiar).

---

## R5 — PUSH con `business_id` controlado por el cliente 🟠

**Archivos:** `syncService.ts:344`, `useSimpleSync.ts:76`, `syncService.ts:484` (`resolveConflict`)

**Problema:** el `upsert(..., { onConflict: 'id' })` sube el `business_id` tal cual viene de IndexedDB (editable por el usuario con DevTools) → posible escritura cross-tenant si RLS lo permite, o corrupción de datos si no. `resolveConflict` sube `localItem` sin validar su `business_id` en absoluto.

**Solución (por capas):**
1. **BD (principal):** RLS de INSERT/UPDATE con la condición de tenant (R2) — un `business_id` ajeno simplemente será rechazado.
2. **Cliente (higiene):** antes del push, sobrescribir `business_id` con el del perfil autenticado en lugar de confiar en el registro local.
3. Aplicar lo mismo en `resolveConflict`.

**Dificultad:** 🔴 Alta (depende de R2) | **Riesgo:** 🟡 — el paso 2 es solo limpieza; el paso 1 es RLS.

---

## 🆕 Hallazgos nuevos (re-auditoría 07/11/2026)

### R16 — PUSH de `instituciones` permite escribir narrativa de otros tenants 🟡

**Archivos:** `syncService.ts:39-45` (`PUSH_TABLES` incluye `instituciones`), `useSimpleSync.ts:16`

**Problema:** `instituciones` es la única tabla que el PULL descarga **completa** (R4) y que el PUSH sube **sin filtro por tenant**. Como el `upsert` usa `onConflict: 'id'` con datos que vienen de IndexedDB, si se inserta/edita una institución local con un `id` ajeno (visible en el PULL, que entrega todos los ids), el push puede sobrescribir el *nombre/estado* de la institución de otro tenant. No revela datos propios, pero permite saboteo o corrupción referencial.

**Solución:**
1. **BD (principal):** política RLS de UPDATE/INSERT en `instituciones` restringida a la institución propia (R2).
2. **Cliente (higiene):** en el PUSH, filtrar `instituciones` a `id === businessId` del perfil autenticado.

### R17 — Cambio de email del perfil sin tocar el email de Auth 🟡

**Archivo:** `users.ts:154-167` (path de auto-actualización)

**Problema:** cuando un usuario edita su propio perfil, el `update` cambia `perfiles.email` pero **no** `auth.users.email`. Quedan desincronizados: emails distintos entre login y listado, y confusiones con recuperación de contraseña. Además no se verifica unicidad (colisiona con el email de la acción de admin).

**Solución:** en el path self-update, si `data.email` cambia, usar `supabaseAdmin.auth.admin.updateUserById(id, { email })` (deja trail en Auth y respeta unicidad) y reflejar el resultado en `perfiles`; si falla, no actualizar `perfiles.email`.

### R18 — `rol` y otros campos aceptan valores arbitrarios 🔵

**Archivo:** `users.ts:73-81, 176-182`

**Problema:** `createUserAction`/`updateUserAction` escriben `data.rol` sin validar contra el enum (`'admin' | 'personal'`) — basura o satisfacción de campos arbitrarios directo a la BD.

**Solución:** validar con Zod `z.enum(['admin','personal'])` (o el enum de `types/index.ts`) en ambas actions.

### R19 — Datos de pacientes/atenciones persistidos en el navegador (informativo) 🔵

**Contexto:** toda la app replica datos clínicos a Dexie/IndexedDB para el modo offline-first. Es un trade-off del diseño, no un bug. Solo recordar: en `signOut` no se borra Dexie, con lo cual un dispositivo compartido conserva datos del tenant tras cerrar sesión.

**Solución:** decisión de producto — opcionalmente, en `signOut`, borrar tablas de datos (no configuración) o implementar bloqueo con PIN para la PWA.

---

## ✅ Checklist Fase 3

- [ ] Exportar `pg_policies` actual → primera migración versionada
- [ ] Auditar cobertura de las 7 tablas
- [ ] Escribir políticas correctas (condición por subconsulta, no `business_id = auth.uid()`)
- [ ] Aplicar en **staging** → matriz de prueba completa
- [ ] R4: filtrar PULL de `instituciones` + corregir `seedData`
- [ ] R5: forzar `business_id` del perfil autenticado en PUSH y `resolveConflict`
- [ ] R16: RLS de `instituciones` + filtrar push/pull a la institución propia
- [ ] R17: sincronizar email Auth↔perfiles en self-update
- [ ] R18: Zod `rol` enum en create/update
- [ ] R19 (opcional): limpiar Dexie en `signOut` — decisión de producto
- [ ] Recién entonces: aplicar en producción

---

# 📋 Orden de ejecución recomendado

```
FASE 1 (hoy)        →  corta el vector explotable R1/R6
EXPORTAR RLS        →  sin esto, la Fase 3 se hace a ciegas
FASE 3 (staging)    →  es la que protege los datos de verdad
FASE 2 (seguidita)  →  defensa en profundidad
```

**Razón del orden:** R1 es explotable hoy mismo por cualquier persona con la consola abierta; RLS es más peligroso a largo plazo pero necesita staging; la Fase 2 depende de que R1/RLS estén bien para no dar una falsa sensación de seguridad.

---

# 🧪 Estrategia de testing transversal

El repo ya tiene **vitest** funcionando (`vitest.config.ts`), pero **ningún test cubre las server actions**. Este plan debe dejar como mínimo:

1. **`src/features/usuarios/actions/users.test.ts`** — casos: sin sesión → lanza / no-admin → lanza / admin-ok → pasa / admin de otro tenant → lanza (R1 + R6).
2. **Test del middleware** — sin sesión en ruta protegida → redirect; con sesión → pasa.
3. **Regresión manual por fase** (las checklist de cada fase).
4. **Comandos de siempre antes de cada merge:** `npx tsc --noEmit` · `npx vitest run` · smoke test manual.

---

# 📝 Registro de progreso

| Fecha | Fase | Hallazgos cerrados | Observaciones |
|-------|------|--------------------|---------------|
| 06/11/2026 | — | Análisis inicial | 15 hallazgos documentados, pendiente todo |
| 07/11/2026 | — | Re-auditoría | 12 confirmados · R6 parcial (softDelete = falso positivo) · R4/seedData = código muerto · +4 nuevos (R16-R19). Plan correctivo detallado en `PLAN_CORRECTIVO_SEGURIDAD.md` |
| 08/11/2026 | 1 | R1 cerrado ✅ | Fallback admin eliminado (`users.ts`), try/catch silencioso de `currentUserId` eliminado, toasts de "Sesión expirada" en `UserModal` y `useUsuarios`. `tsc --noEmit` OK · 43/43 tests unitarios pass · fallo preexistente de `simularAtencion.test.ts` (env vars ausentes en entorno de test, no relacionado). **Pendiente: smoke test manual con admin real (crear/editar/desactivar usuario)** |
| | 1 | | |
| | 3 | | |
| | 2 | | |

---

*Documento generado a partir del análisis de código del 06/11/2026. Actualizar esta tabla conforme se avance.*
