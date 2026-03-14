# Canonical Architecture Refactoring Walkthrough

## Objetivos Alcanzados
Se ha completado satisfactoriamente la refactorización arquitectónica de todos los módulos del proyecto (Pacientes, Usuarios, Inventario, Atenciones, Movimientos) para adherirse al diseño canónico especificado en el `TOPICO_PROJECT_SPEC.md`. 

Todos los errores de tipado de TypeScript derivados de la desconexión de tipos y repositorios heredados han sido corregidos de forma sistémica, asegurando un **entorno type-safe y libre de errores de compilación**.

## Cambios y Refactorizaciones Clave

### 1. Entidades Base Universales (`BaseEntity`, `SyncStatus`)
- Se eliminaron las definiciones locales aisladas de `BaseEntity` y `SyncStatus` en cada módulo (ej. en `src/features/*/types`).
- Se consolidó y unificó `BaseEntity` en `src/core/db/dexie/types.ts`.
- Los campos de auditoría (`creado_at`, `actualizado_at`) y de estado asíncrono (`sync_status`, `activo`) han pasado a ser **estrictamente requeridos** para respaldar el correcto funcionamiento offline-first e integración con Supabase.

### 2. Estandarización de `useDexieCrud`
- El hook genérico `useDexieCrud.ts` fue reescrito para soportar multi-tenancy (`business_id`) nativo.
- Ahora este hook inyecta automáticamente los campos de auditoría (`sync_status: 'pending'`, `actualizado_at`, `creado_at`) evitando redundancias manuales en cada controlador.
- Se reparó el contrato genérico `IDType`, asegurando compatibilidad completa con el formato `EntityTable` introducido por **Dexie 4**. 

### 3. Eliminación del Patrón "Repository"
- Todas las carpetas y archivos locales orientados al Patrón Repository (`*.repository.ts`) alojadas dentro de `src/features/*/repositories/` fueron identificadas como obsoletas y eliminadas completamente.
- La lógica especializada contenida en los repositorios antiguos fue migrada directamente hacia los Custom Hooks correspondientes (`usePacientes`, `useAtenciones`, `useMedicamentos`, `useMovimientos`, `useUsuarios`).
- Esto facilitó un diseño más reactivo mediante llamadas directas a `db.*` utilizando tanto promesas como reactividad vía `useLiveQuery`.

### 4. Correcciones Específicas en Módulos y Modelos
#### Módulo: Pacientes
- Se conectó `PacienteFormData` mediante `Omit` garantizado, excluyendo la inyección interna permitida a `useDexieCrud`.
#### Módulo: Inventario & Movimientos
- Remapeo de referencias UI desde `stock_virtual` heredado a `stock_actual` dictado por diseño de base de datos SQL.
- El enum `TipoMovimiento` pasó de minúsculas (`entrada`/`salida`) a **MAYÚSCULAS** (`ENTRADA`/`SALIDA`), cumpliendo con los SQL constraints (check) definidos en la base de datos Supabase. Todas las llamadas en código (`MovimientoStockModal.tsx`, `movements/page.tsx`) se corrigieron.
#### Módulo: Atenciones
- El hook `useAtenciones` adquirió la transacción atómica completa que inyecta automáticamente el ID del personal médico (perfil_id) y decuenta inventarios en cascada (`SALIDA` automáticos de stock).
- Se repararon las aserciones de TypeScript en la UI (`attentions/page.tsx` y `attentions/new/page.tsx`), integrando un mapa predefinido vacío en caso de ausencia de Constantes Vitales (`signos_vitales`).
- Se rediseñó `DashboardCharts` para dejar de depender de sus importaciones huérfanas derivadas del repositorio, inyectando la consulta a Dexie directamente y reestableciendo de forma exitosa los arreglos JSON localizados.

### 5. Configuración y Prevención de Errores V8
- **Fix de SchemaError Dexie v8:** Se introdujo la variable de indexación `creado_at` en `movimientos_stock` y `atenciones` (`v8`), solucionando caídas abruptas en la UI (por ej., `.orderBy('creado_at').reverse()`).
- **Prevención Supabase HTTP 409 (Conflict):** Se bloqueó la propagación del `demo-business-id` autogenerado dentro de `seedData.ts` cuando un Entorno Local iniciaba en blanco sin un `business_id` institucional legítimo, lo que anteriormente detonaba violaciones de **Foreign Key** (`business_id_fkey`) en los push del `SyncService`.

### 6. Configuración del Proyecto
- Finalmente, se removió el rastreo tipográfico al paquete `@types/uuid` (que provocaba el error persistente final de `npx tsc`) el cual ya no era requerido, consolidando el uso orgánico de `crypto.randomUUID()`.

## Estado de Compilación
El chequeo tipográfico riguroso (`pnpm tsc --noEmit`) devuelve **0 Errores**, demostrando una estabilidad arquitectónica impecable antes del empuje a Producción (Build de Next.js u operaciones de Continuous Integration).

## Próximos Pasos (Sugeridos)
1. Iniciar pruebas exhaustivas offline apagando el Wi-Fi e insertando registros para validar cómo se almacenan como `pending` en `BaseEntity`.
2. Encender la conexión a Internet y monitorear el Background Sync de Dexie empujando Data a `Supabase`.
3. Validar las políticas de RLS en base a los recientes acoplamientos y el correcto uso de `business_id` en las entidades Supabase.
