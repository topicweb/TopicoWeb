# 🔧 PLAN CORRECTIVO DE SEGURIDAD — TópicoWeb (PWA + Supabase)

> **Fecha:** 07/11/2026
> **Origen:** re-auditoría de `PLAN_SEGURIDAD.md` contra el código real.
> **Veredicto global:** 12 hallazgos confirmados, 1 parcial (R6), 1 falso positivo parcial (R6–softDelete), 4 hallazgos nuevos (R16–R19).
> **Principio rector:** cada corrección se aplica de modo **incremental y con rollback trivial** (commit por fix), para no romper la aplicación que hoy es funcional. Nada de este plan exige reescrituras: son parches quirúrgicos.
> **Leyenda de nivel:** 🔴 Crítico (explotable hoy, corregir YA) · 🟠 Alto (esta semana) · 🟡 Medio (defensa en profundidad) · 🔵 Bajo/Informativo (higiene).

---

## 🗺️ Roadmap resumido

| Orden | Acción | Nivel | Esfuerzo | Riesgo de romper la app |
|---|--------|-------|----------|--------------------------|
| 1 | R1: eliminar admin-fantasma | 🔴 | 30 min + observación | 🟢 con pre-check (ver paso 1.1) |
| 2 | R6: IDOR en `updateUserAction` | 🟠 | 30 min | 🟢 nulo |
| 3 | R7: `server-only` | 🟡 | 10 min | 🟢 nulo (falla en build si algo va mal) |
| 4 | R8 + R18: Zod contraseñas y rol | 🟡 | 1 h | 🟢 solo agentes contraseñas débiles nuevas |
| 5 | R9: quitar `business_id` del updatePayload | 🟡 | 10 min | 🟢 nadie lo usa (verificado en `useUsuarios.ts`) |
| 6 | R10 + R15: sanitizar logs | 🔵 | 30 min | 🟢 |
| 7 | R12: purgar `localStorage` legacy | 🔵 | 15 min | 🟢 |
| 8 (staging) | R2 + R4 + R5 + R16: RLS y sync segregado | 🔴 | 1-2 días | 🟠 moderado con staging. Sin R2, los vuelos son extremadamente delicados. |
| 9 | R3: guard server-side | 🟠 | 1 h | 🟡 probar rutas y offline |
| 10 | R11: cabeceras HTTP + CSP | 🟡 | 2 h aprox. | 🟡 en 3 etapas |
| 11 | R17: email sincronizado | 🟡 | 30 min | 🟢 |
| 12 | R14: tipado de tablas Dexie | 🔵 | 30 min | 🟢 |
| 13 | R19 (opcional): limpiar Dexie al cerrar sesión | 🔵 | 1 h + decisión de producto | 🟡 afecta UX offline compartida |

---

# 🔴 BLOQUE A — R1: admin fantasma sin sesión

## A.0. Diagnóstico
- Archivo: `src/features/usuarios/actions/users.ts:49-57`
- El `catch` de "No autenticado" devuelve `{ rol:'admin', business_id, activo:true }`.
- Las Server Actions de Next son endpoints **invocables por cualquiera que conozca el action ID** (público en el JS compilado).
- Consecuencia hoy: un atacante sin sesión puede crear usuarios admin reales en cualquier tenant (`supabaseAdmin` bypasesa RLS).

## A.1. Previo (no romper): 3 días de observación
Paso previo porque el fallback se agregó para cubrir una cookie ausente. Antes de borrarlo, confirmar que ningún flujo legítimo depende de él.

```ts
// users.ts — DENTRO del catch, ANTES del if
if (err.message === 'No autenticado') {
  console.warn('[validateAdminAccess][AUDIT] fallback-invocado', {
    ts: new Date().toISOString(),
    hasCookies: true /* el middleware ya las habrá refrescado */,
    businessId,
  });
  return { rol: 'admin', business_id: businessId, activo: true }; // NO tocar aún
}
```
Monitorear consola/telemetría con estos casos reales: admin online desktop, admin PWA instalada, admin que recarga tras tab inactiva. Si el warn **jamás** se dispara en uso legítimo → seguir al paso A.2.

## A.2. Corrección definitiva (cuando el pre-check esté limpio)

### Commit 1 — eliminar el try/catch del `currentUserId` (mitad del exploit)
```ts
// updateUserAction — ANTES
let currentUserId: string | null = null;
try { currentUserId = (await getAuthenticatedUser()).id; } catch { }

// DESPUÉS
const currentUserId = (await getAuthenticatedUser()).id;
```
Sin esto, el sin-sesión cae directo al path admin.

### Commit 2 — eliminar el fallback completo
```ts
// validateAdminAccess — después del commit 2
return perfil;             // feliz camino
} catch (err) { throw err; }  // 'No autenticado' se propaga
```

### Commit 3 — UX: mostrar el error en la UI
`UserModal.tsx:88` hoy hace solo `console.error(error)`. Cambiar:
```ts
import { toast } from 'sonner';
// en el catch de la action:
toast.error(
  error instanceof Error && error.message === 'No autenticado'
    ? 'Sesión expirada. Vuelve a iniciar sesión.'
    : `Error: ${error}`,
);
```
Verificación manual (checklist):
1. [ ] Con admin online: crear/editar/desactivar usuario → igual que antes.
2. [ ] Sin sesión (incógnito + DevTools `fetch` a la action o borrar cookies): → rechaza con error claro.
3. [ ] Con personal loggeado pulsando "Administrar usuarios" (si accede al modal): → rechaza.
4. [ ] PWA: login → профиль visible → crear usuario: funciona.

### Test mínimo (`users.test.ts`)
```ts
getAuthenticatedUser mockeado:
- resolves user + perfil admin del tenant → ✅ devuelve perfil
- throws 'No autenticado' → ✅ validateAdminAccess lanza (no devuelve admin)
- perfil rol 'personal' → ✅ lanza
- perfil.business_id ≠ businessId → ✅ lanza
```

## Por qué esto no rompe producción
El login exige `navigator.onLine` y usa `createBrowserClient`, la sesión vive en cookies; `middleware.ts` renueva cookies en TODAS las rutas, incluidos los POST de server actions. Por eso el fallback es redudante y solo ayuda al atacante.

---

# 🟠 BLOQUE B — R6: IDOR en `updateUserAction`

## Diagnóstico
- `users.ts:174-184`: valida al caller contra *su* tenant, pero actualiza `.eq('id', id)` sin saber el tenant del target.
- Impacto: admin del tenant A puede promover a `admin` al `personal` del tenant B, cambiar su email, o robarle la cuenta (summary: elevar por email/password reset en otro tenant).
- ⚠️ **No cambiar `softDeleteUserAction`**: ya consulta el `business_id` del target y valida al caller contra ese tenant (`users.ts:193-204`). El IDOR está **solo** en `updateUserAction`.

## Solución (20 líneas)
```ts
// updateUserAction, después de validateAdminAccess
const { data: target, error: tErr } = await supabaseAdmin
  .from('perfiles')
  .select('business_id')
  .eq('id', id)
  .single();

if (tErr || !target) {
  throw new Error('Usuario objetivo no encontrado');
}
if (target.business_id !== data.business_id) {
  throw new Error('No tienes permiso para operar sobre este usuario');
}
// aquí sigue el update existente
```
Para `data.email` del target, añadir además unicidad: si otro perfil ya usa ese email, fallar con mensaje claro (colisión que hoy produce error 23505 ambiguo).

Test: mock + target de otro tenant → lanza / target del mismo tenant → pasa.

---

# 🟡 BLOQUE C — Fixes triviales de Fase 1 (bajo esfuerzo, gran higiene)

## C.1. R7 — `server-only` en `admin.ts`
```bash
pnpm add server-only
```
```ts
// admin.ts — línea 1
import 'server-only';
import { createClient } from '@supabase/supabase-js';
```
Si algo (cualquier componente cliente) empezara a importar `admin.ts`, el build casca con mensaje claro. Beneficio: barrera mecánica contra fuga de la SERVICE_ROLE_KEY.

## C.2. R8 + R18 — Zod password y rol
`zod` ya está en `package.json` → sin instalacion nueva.

```ts
// src/features/usuarios/actions/users.ts (o src/shared/schemas/password.ts)
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir una mayúscula')
    .regex(/[0-9]/, 'Debe incluir un número'),
  rol: z.enum(['admin', 'personal']),
  nombre: z.string().min(1).max(120),
  business_id: z.string().uuid(),
});

// createUserAction (después de la guardia admin, ANTES de tocar la BD)
const parsed = createUserSchema.safeParse({ ...data, rol: data.rol ?? 'personal' });
if (!parsed.success) {
  throw new Error(parsed.error.issues[0].message);
}
```

Espejo en `UserModal.tsx` para feedback inmediato (validación local idéntica antes de submit, error inline debajo del input).

⚠️ Cuidado de producto: la regla debe coincidir con la configuración de Auth de Supabase; sino el error del panel llegará desde Supabase igual (acceptable but validado en staging).

## C.3. R9 — no permitir mover cuentas entre tenants
```ts
// updateUserAction: línea 181 — ELIMINAR
if (data.business_id !== undefined) updatePayload.business_id = data.business_id;
```
`useUsuarios.ts:65` siempre manda el `business_id` del caller — nadie lo usa legítimamente. El parámetro queda solo para validar el tenant (C.B).
```ts
// nota: `validateAdminAccess(data.business_id)` sigue: valida al admin contra SU tenant,
// y C.B garantiza que el target pertenezca a ese mismo tenant.
```

## C.4. R10 — logger sanitizado en producción
```ts
// core/utils/logger.ts
private sanitize(args: unknown[]): unknown[] {
  return args.map((a) => {
    if (a instanceof Error) {
      return { name: a.name, message: a.message, code: (a as any).code };
    }
    if (a && typeof a === 'object' && 'message' in (a as any) && 'code' in (a as any)
        && 'details' in (a as any)) {
      // shape clásico de error PostgREST de Supabase
      return { code: (a as any).code, message: (a as any).message };
    }
    return a;
  });
}

warn(msg, ...args) { if (this.shouldLog('warn')) console.warn(`[WARN] ${msg}`
  , ...(isDevelopment ? args : this.sanitize(args))); }
error(idem;)
```
En dev el comportamiento queda intacto. En producción solo `message` + `code`.

## C.5. R15 — migrar `console.*` → `logger`
Archivos con uso directo: `useSimpleSync.ts:79,88,96`, `deviceId.ts:29,38,48`, `SyncMonitor.tsx:42`, `useBidirectionalSync`(buscar), `syncService.ts:217` (`catch(console.error)` → `logger.error`). Búsqueda global: `grep -rn "console\\." src/ | grep -v logger.ts`.
Riesgo cero: `logger` ya existe y respeta niveles.

## C.6. R12 — purgar `localStorage` legacy
```ts
// AuthProvider.tsx — migrateLegacyLocalStorageSession, tras el setSession exitoso
if (access_token && refresh_token) {
  await supabase.auth.setSession({ access_token, refresh_token });
  localStorage.removeItem(storageKey);   // ← NUEVO: el XSS no podrá re-leerla
}
```
Y cuando se confirme que nadie depende de la migración (2+ meses online en producción), eliminar `migrateLegacyLocalStorageSession` y su llamada en el `useEffect` (línea 227).

## C.7. R14 — tipar acceso a tablas Dexie
```ts
// syncService.ts
import { Transaction } from 'dexie'; // no hace falta; basta con un mapa tipado
type SyncTable = Record<string, DexieTable>;
const getTable = (name: string) => {
  const t = (db as unknown as SyncTable)[name];
  if (!t) throw new Error(`Tabla desconocida para sync: ${name}`);
  return t;
};
// reemplaza los 3 usos de (db as any)[tableName]
```

---

# 🟠 BLOQUE D — R3: protección de rutas server-side

## Diagnóstico
- `middleware.ts` solo renueva la sesión (no redirige).
- El guard real es `useEffect → router.replace('/login')` en `(dashboard)/layout.tsx` → evitable con JS deshabilitado o peticiones directas.
- `role`/`businessId` provienen de Dexie/IndexedDB, editables con DevTools → `canDelete = role === 'admin'` (`patients/page.tsx:22`) es un espejo local, no seguridad.

## Solución
```ts
// middleware.ts — tras el getUser actual
const { data: { user } } = await supabase.auth.getUser();

const isProtected = !request.nextUrl.pathname.startsWith('/login')
  && request.nextUrl.pathname !== '/';
const isStatic = /\.[^/]+$/.test(request.nextUrl.pathname)   // *.png, *.css, sw.js…

if (isProtected && !isStatic && !user) {
  return NextResponse.redirect(new URL('/login', request.url));
}
```
El bloque cliente-`useEffect` se mantiene para UX (spinner y evita flash).

⚠️ **Verificación tras aplicar:**
| Caso | Esperado |
|------|----------|
| `/` de landing sin sesión | ✅ pasa (marketing) |
| `/login` sin sesión | ✅ pasa |
| `/dashboard` sin sesión | 🚫 redirect `/login` |
| `/dashboard/atenciones` con sesión | ✅ carga |
| Login exitoso → dashboard | ✅ carga |
| **PWA offline**: presionada la app desde el home screen | ✅ sigue funcionando (el SW responde desde cacheHTTP sin pasar por middleware) |
| Logout → intentar volver a `/dashboard` con Back | 🚫 redirect |
Test de UI: Postman/curl a `GET /dashboard` sin cookie → debe `307 → /login`.

## Aclaración clave
La seguridad REAL contra datos no centralistas la otorga RLS (R2). R3 es la barrera contra ver pantallas vacías/logos de la app (data leakage UI). Ambas son necesarias.

---

# 🟡 BLOQUE E — R11: cabeceras HTTP

## Solución incremental en `next.config.ts`
```ts
const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options',           value: 'DENY' },
        { key: 'X-Content-Type-Options',    value: 'nosniff' },
        { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
        // PASSO 1 (defer 2 semanas): solo reporta, no bloquea
        { key: 'Content-Security-Policy-Report-Only',
          value: csp },
      ],
    }];
  },
};
const csp = [
  "default-src 'self'",
  // Supabase y sus WebSockets, Hosting PWA assets:
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  // Next inline scripts (aller Next.js usa bots/hidratación con nonce via middleware):
  "script-src 'self' 'unsafe-inline'" + (prod? " 'strict-dynamic'" : "") + /**
   * por simplicidad inicial: mantener 'unsafe-inline' hasta que Middleware CSP nonce funcione
   */,
  "style-src 'self' 'unsafe-inline'",   // Tailwind inline
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",            // service worker
  "manifest-src 'self'",
].join('; ');
```
⚠️ **Importante:** Next.js 16 + Netlify + PWA: un CSP con `nonce` exige middleware; es la fase 2. La versión report-only es segura para producción (no rompe nada; solo reporta).

Tras 2 semanas sin reportes críticos: quitar `-Report-Only` y activar la CSP firmada. Test imperativo: PWA, login, sync, PDF (jspdf depende de blob → `worker-src`/`img-src` blob cubierto).

Para producción REAL el objetivo es:
```ts
"script-src 'self'" (sin unsafe-inline) — con nonce via middleware
"connect-src 'self' https://<ref>.supabase.co wss://<ref>.supabase.co"
```
Donde `<ref>` es el project ref de Supabase hardcodeado para no abrir tanto.

---

# 🔴 BLOQUE F — R2/R4/R5/R16: RLS + sync segregado (STAGING OBLIGATORIO)

> ⚠️ **Este es el cambio más delicado.** Se conecta al browser con la anon key. Una política mal escrita NO produce un error visual — rompe el sync en silencio (los usuarios "dejan de ver datos"). Por eso: staging → matriz de prueba → deploy.

## F.0. Preparación (30 min)
1. En Supabase Dashboard → SQL Editor:
```sql
SELECT schemaname, tablename, policyname, permissive, roles,
       cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```
2. Copiar el output** completo** a `supabase/migrations/20261107XX_snapshot_rls_actual.sql` (solo como documentación, no para ejecutar). Este es el "estado actual".

## F.1. R2 — políticas correctas (nuevo SQL en `supabase/migrations/`)
```sql
-- 0. Habilitar RLS en todas las tablas críticas (idempotente)
alter table public.instituciones       enable row level security;
alter table public.perfiles            enable row level security;
alter table public.programas_estudio   enable row level security;
alter table public.pacientes           enable row level security;
alter table public.medicamentos        enable row level security;
alter table public.atenciones          enable row level security;
alter table public.movimientos_stock   enable row level security;

-- Helper reutilizable: tenant del usuario autenticado
create or replace function public.mi_tenant() returns uuid
language sql stable security definer set search_path = public as $$
  select business_id from public.perfiles where id = auth.uid()
$$;

-- Policy genérica por tabla (repetir para cada una, con sus permisos):
create policy "tenant_select" on public.pacientes
  for select using (business_id = public.mi_tenant());
create policy "tenant_insert" on public.pacientes
  for insert with check (business_id = public.mi_tenant());
create policy "tenant_update" on public.pacientes
  for update using (business_id = public.mi_tenant())
               with check (business_id = public.mi_tenant());
-- sin policy de DELETE → nadie borra filas desde el cliente (soft-delete solo)

-- perfiles: leer los del tenant Y el propio
create policy "perfil_self_read" on public.perfiles
  for select using (id = auth.uid() or business_id = public.mi_tenant());

-- instituciones: solo la propia
create policy "inst_own" on public.instituciones
  for select using (id = public.mi_tenant());
create policy "inst_own_write" on public.instituciones
  for update using (id = public.mi_tenant())
               with check (id = public.mi_tenant());

-- movimientos_stock (sin timestamp): igual patrón, sin 'gt'
-- Supabase necesita tambien actualizar inserted/updated rows
-- (los upsert del cliente son INSERT + UPDATE en la misma query):
--   Asegúrate de que las policies de INSERT/UPDATE permitan el ciclo.
```
⚠️ **No usar `business_id = auth.uid()`** — compara ID de institución con ID de usuario y no matchea nunca (bug existente en `doc/implementation_plan.md:317`).

⚠️ La función `mi_tenant()` es `security definer` para evitar recorenta en la política de `perfiles` (RLS-loop). Returna NULL si no hay perfil → el auth falla → nada visible. Añadir test con usuario real.

## F.2. R4 — pull filtrado de instituciones + seedData
```ts
// syncService.ts:129
const result = await supabase
  .from('instituciones')
  .select('*')
  .eq('id', businessId);   // solo la propia
```
Y `seedData.ts` — **código muerto** (verificado 07/11/2026): la función `seedDatabase` no se invoca desde ningún archivo. Solución priotaria: **eliminar el archivo** y su import directo si queda alguno (grep `seedDatabase`). Si algún día se necesita seed, reescribir tomando la institución **del perfil** del usuario (no `.limit(1)`), que hoy tomaría una ajena.

## F.3. R5 — higiene del PUSH (capa cliente)
```ts
// syncService.ts — upsertAndMarkSynced
const businessId = (await getPerfilBusinessId());  // del auth user, NO de Dexie al vuelo
const cleanData = pending
  .map((item) => this.cleanRecordForPush(tableName, item))
  .map((item) => TABLES_WITHOUT_BUSINESS_ID.includes(tableName) ? item
    : { ...item, business_id: businessId });      // ← overwrite SIEMPRE
```
Y en `resolveConflict` antes del upsert (`rest.business_id = businessId`) para estar seguro. La capa BD (F.1) hacer la defensa real; esta es higiene.

## F.4. R16 — PUSH de instituciones restringido
```ts
// pushToSupabase: filtrar instituciones
if (tableName === 'instituciones') {
  pending = pending.filter((i: any) => i.id === businessId);
  if (pending.length === 0) continue;
}
```

## F.5. Matriz de pruebas (marcar TODAS en staging antes de prod)
- [ ] Login → PULL completo → dashboard con datos.
- [ ] Crear paciente offline → PUSH → visible desde **otra cuenta del mismo tenant**.
- [ ] Paciente de otro tenant → NO visible (ni por UUID en request directo con devtools).
- [ ] `perfiles`: leo los del tenant + el propio; no otros tenants.
- [ ] `instituciones`: solo la propia (ni en PULL, ni en la API).
- [ ] Upsert (PUSH) de fila existente del tenant → UPDATE ok.
- [ ] Server actions (crear/editar usuario) siguen funcionando (bypasesan RLS con service role).
- [ ] PWA offline: crear/registrar/atender → PUSH ciente online.

## F.6. Rollback
`drop policy ... on tabla; disable row level security` por tabla (o ejecutar el inverso del migration file en staging → luego prod). Git diff del SQL de políticas versionado en repo.

---

# 🟢 BLOQUE G — Higiene menor (R13, R17, R19)

## G.1. R13 — deviceId spoofable (🔵)
El deviceId solo alimenta `sync_metadata` (cuándo sincronizar). Spoofar causa PULL completo masivo (podría provocar throttling). Mitigación ligera: al cerrar sesión (`signOut`), no borrar el deviceId (evita masiva PULL): es aceptable el estado actual; evaluar migrar deviceId a cookie httpOnly en Fase 3. **Acción: documentar y dejar.**

## G.2. R17 — email Auth ↔ perfiles (🟡)
```ts
// users.ts — updateUserAction, en el path self-update:
if (data.email && data.email !== perfil.email) {
  const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
    currentUserId, { email: data.email }
  );
  if (authErr) {
    // igual queda el email en Auth y perfiles NO lo refleja en silencio
    throw new Error(`No se pudo actualizar el email: ${authErr.message}`);
  }
}
```
Si algún flujo inmediato requiere doble confirmación (verificación de email en Supabase), dejarlo con emailing — indicar claramente si el email no confirmado.

## G.3. R19 — datos clínicos en IndexedDB (🔵 informativo)
Elección de producto:
- **Opción A (recomendada):** al hacer `signOut`, si no es dispositivo personal (o siempre), borrar tablas de datos:
```ts
async function clearLocalData() {
  await Promise.all(
    ['instituciones','perfiles','programas_estudio','pacientes','medicamentos','atenciones','movimientos_stock','sync_metadata']
      .map(t => (db as any)[t].clear())
  );
}
// llamar en signOut() antes de router.push('/login')
```
⚠️ Estudia UX: un disin en un disp. compartido demora la próxima login (Full PULL). Decidir con el cliente.
- **Opción B:** bloqueo por PIN en la PWA (más esfuerzo).

---

# ✅ Checklist maestro (orden recomendado)

### Bloque A — HOY (prioridad: corte del ataque directo)
- [ ] A.1 pre-check: log temporal en el `catch` + observar 3 días flujos admin (desktop + PWA)
- [ ] A.2 commit 1: `currentUserId` sin try/catch silencioso
- [ ] A.2 commit 2: eliminar fallback `No autenticado`
- [ ] A.2 commit 3: toast "Sesión expirada" en `UserModal`/`useUsuarios`
- [ ] Test `users.test.ts` (getAuthenticatedUser mockeado)
- [ ] `npx tsc --noEmit` && `npx vitest run` && smoke manual

### Bloque B — HOY (junto con A)
- [ ] R6: verificar tenant del target en `updateUserAction`
- [ ] Test de IDOR (target otro tenant → lanza)

### Bloque C — esta semana
- [ ] R7: `pnpm add server-only` + import en `admin.ts`
- [ ] R8+R18: Zod password (8+, 1 mayúscula, 1 número) y `rol` enum, server + client
- [ ] R9: eliminar `business_id` del `updatePayload`
- [ ] R10: sanitizado en logger (producción: sólo message+code)
- [ ] R15: `console.*` → `logger` en todos los archivos
- [ ] R12: `localStorage.removeItem(storageKey)` tras `setSession`
- [ ] R14: helper `getTable(name)` tipado en `syncService`

### Bloque D — esta semana (tras R2 en staging estar preparado)
- [ ] R3: redirección server-side en middleware
- [ ] Verificar los 7 casos de la tabla (incluida navegación offline PWA)

### Bloque E — gradual
- [ ] R11: cabeceras básicas + CSP `Report-Only`
- [ ] 2 semanas → CSP activa

### Bloque F — STAGING (el crítico)
- [ ] Exportar `pg_policies` a migración snapshot
- [ ] SQL de políticas correctas (función `mi_tenant`)
- [ ] R4: filtrar PULL instituciones + eliminar `seedData.ts` (código muerto)
- [ ] R5: sobrescribir `business_id` en PUSH/`resolveConflict`
- [ ] R16: filtrar PUSH de instituciones
- [ ] Matriz de pruebas completa → recién entonces aplicar en PROD

### Bloque G — higiene
- [ ] R17: actualizar email en Auth
- [ ] R19 (opc.): limpiar Dexie al `signOut` (decisión de producto)
- [ ] R13: documentado, sin acción inmediata

---

# 🧪 Tests mínimos (regresión permanente)

1. `src/features/usuarios/actions/users.test.ts` (nuevo — vitest ya está configurado):
   - sin sesión → lanza `No autenticado`
   - no-admin → lanza
   - admin ok → pasa
   - admin de otro tenant → lanza
   - target de otro tenant → lanza (R6)
   - `validateAdminAccess`: **no devuelve** rol admin jamás en el catch (R1)
2. Test de middleware (con `next/test` o manual + Playwright): rutas protegidas → 307 a `/login`.
3. Comandos antes de merge: `pnpm tsc --noEmit` && `pnpm vitest run` && smoke manual según bloque.

---

# 📊 Mapa explotable → impacto (por qué este orden)

| Por qué primero | Explicación |
|---|---|
| R1 es el más grave | Hoy un usuario cualquiera con la consola abierta puede crear una cuenta admin REAL en cualquier tenant. No requiere login. |
| El resto de hallazgos se multiplican por R1 | Con una cuenta admin falsa se pueden ejecutar R6, R9, R17 con más potividad. Al cortar R1, el impacto de esos cae en picada. |
| R4/R5/R16 pese a ser altas se corrigen HOY solo en la parte cliente — la REAL es RLS | RLS no se puede aplicar a ciegas: primero Exportar pg_policies (F.0), luego staging. Son varias horas de QA: el riesgo funcional de romper sync es mayor que el vector actual (que requiere autenticación). |
| Fase 2 es "defensa en profundidad" | R3 y R11 no protegen datos sino expores de superficie y UX, y dependen de que R1/RLS estén bien para no dar una falsa sensación de seguridad. |

---

*Documento derivado de la re-auditoría del 07/11/2026. Cada bloque es autocontenido: se puede subir un commit por ítem con rollback trivial (revert del commit).*
