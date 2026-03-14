# Feature Module Architecture — Refactoring a la Estructura Canónica

El objetivo es establecer `features/pacientes` como el **módulo de referencia** y llevar todos los demás módulos al mismo estándar:
- Solo 3 carpetas por feature: `components/` · `hooks/` · `types/`
- Una única fuente de verdad para `BaseEntity` / `SyncStatus`
- Los hooks dependen de `useDexieCrud` (no de repositorios)
- Todos los tipos alineados con el esquema SQL real del spec

## Proposed Changes

---

### 1 · Core Shared Types

#### [MODIFY] [types.ts](file:///c:/MisProyectosWeb/topico-pwa/src/core/db/dexie/types.ts)
Añadir `business_id` a `BaseEntity` (presencia opcional cuando no aplica, e.g. `programas_estudio` en offline) y confirmar que es la **única** definición de `BaseEntity` / `SyncStatus` en todo el proyecto.

#### [MODIFY] [use-dexie-crud.ts](file:///c:/MisProyectosWeb/topico-pwa/src/shared/hooks/use-dexie-crud.ts)
- En `create`: inyectar `sync_status: 'pending'` y `actualizado_at: new Date().toISOString()` junto con los campos actuales.
- En `update`: inyectar `actualizado_at` y `sync_status: 'pending'` automáticamente.

---

### 2 · `features/pacientes` (módulo plantilla)

#### [MODIFY] [types/index.ts](file:///c:/MisProyectosWeb/topico-pwa/src/features/pacientes/types/index.ts)
- Cambiar el import de `BaseEntity` de `@/core/db/dexie/types` (ya correcto, solo verificar)
- Agregar `PacienteFormData` — tipo de datos del formulario UI (sin campos gestionados por el CRUD)

#### [MODIFY] [hooks/usePacientes.ts](file:///c:/MisProyectosWeb/topico-pwa/src/features/pacientes/hooks/usePacientes.ts)
- Agregar helper `buscarPorDni(dni: string)` para búsqueda rápida previa al registro
- Mantener el patrón `useDexieCrud<Paciente>` sin cambios de fondo

---

### 3 · `features/usuarios`

#### [MODIFY] [types/index.ts](file:///c:/MisProyectosWeb/topico-pwa/src/features/usuarios/types/index.ts)
- Eliminar las definiciones locales de `BaseEntity` / `SyncStatus`
- Importarlas desde `@/core/db/dexie/types`
- Eliminar `PerfilRepository` (antipatrón: la lógica vive en el hook)

---

### 4 · `features/inventario`

#### [MODIFY] [types/index.ts](file:///c:/MisProyectosWeb/topico-pwa/src/features/inventario/types/index.ts)
Alinear `Medicamento` con el esquema SQL real:
```diff
+ business_id: string;
+ unidad_medida: string;
+ anaquel?: string;
+ stock_actual: number;      // en lugar del `stock_virtual`
  stock_minimo: number;
- tipo: TipoMedicamento;     // no existe en el schema SQL real
```
Eliminar `BaseEntity`/`SyncStatus` locales. Eliminar `MedicamentoRepository`.

#### [MODIFY] [hooks/useMedicamentos.ts](file:///c:/MisProyectosWeb/topico-pwa/src/features/inventario/hooks/useMedicamentos.ts)
Migrar de `DexieMedicamentoRepository` a `useDexieCrud<Medicamento>(db.medicamentos)`.

#### [DELETE] repositories/ folder en inventario

---

### 5 · `features/atenciones`

#### [MODIFY] [types/index.ts](file:///c:/MisProyectosWeb/topico-pwa/src/features/atenciones/types/index.ts)
Alinear `Atencion` con el esquema SQL real:
```diff
+ business_id: string;
+ perfil_id: string;
+ signos_vitales: { temp: string; presion: string; saturacion: string };
  motivo_consulta: string;
  observacion?: string;
  fecha_atencion: string;
```
Eliminar `BaseEntity`/`SyncStatus` locales. Eliminar `AtencionRepository`.

#### [MODIFY] [hooks/useAtenciones.ts](file:///c:/MisProyectosWeb/topico-pwa/src/features/atenciones/hooks/useAtenciones.ts)
Migrar de `DexieAtencionRepository` a `useDexieCrud<Atencion>(db.atenciones)`.
La lógica de `createWithMedications` (transacción Dexie) se mueve directamente al hook.

#### [DELETE] repositories/ folder en atenciones

---

### 6 · Core entities barrel

#### [MODIFY] [core/entities/index.ts](file:///c:/MisProyectosWeb/topico-pwa/src/core/entities/index.ts)
Verificar y corregir los re-exports para que sigan resolviendo tras la limpieza de tipos locales.

---

## Verification Plan

### Build Check (TypeScript)
```powershell
# Desde c:\MisProyectosWeb\topico-pwa
npx tsc --noEmit
```
Debe completar sin errores.

### Dev Server
```powershell
npm run dev
```
Navegar a `http://localhost:3000` y verificar que el dashboard, la página de pacientes y el módulo de inventario cargan sin errores en consola.

### Manual — módulo pacientes
1. Abrir la página de pacientes
2. Crear un paciente nuevo con DNI único → debe guardarse en Dexie correctamente
3. Intentar crear otro paciente con el mismo DNI → debe mostrar error "Ya existe un paciente con este DNI"
4. Editar un paciente → se actualiza el registro
5. Eliminar un paciente → soft delete (activo: false, no aparece en lista)
