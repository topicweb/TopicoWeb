# Feature Module Architecture Refactoring

## Phase 1 – Foundations (core shared types)
- [x] Canonicalize `BaseEntity` / `SyncStatus` in `core/db/dexie/types.ts` (single source of truth)
- [x] Update `use-dexie-crud.ts`: add `sync_status: 'pending'` on create, also add `actualizado_at`

## Phase 2 – `pacientes` module (template / reference)
- [x] `types/index.ts`: re-export `BaseEntity`/`SyncStatus` from `core/db/dexie/types`, clean Paciente interface
- [x] `hooks/usePacientes.ts`: keep pattern useDexieCrud + add `buscarPorDni` helper
- [x] Verify `PatientModal.tsx` still imports correctly

## Phase 3 – `usuarios` module
- [x] `types/index.ts`: remove local `BaseEntity`/`SyncStatus`, import from `core/db/dexie/types`
- [x] `hooks/useUsuarios.ts`: migrate to `useDexieCrud<Perfil>` pattern (remove repository)

## Phase 4 – `inventario` module  
- [x] `types/index.ts`: fix `Medicamento` (add `business_id`, `unidad_medida`, `anaquel`, `stock_actual`, `stock_minimo` per spec SQL); remove local BaseEntity/SyncStatus
- [x] `hooks/useMedicamentos.ts`: migrate to `useDexieCrud<Medicamento>` (remove repository calls)
- [x] Delete `repositories/` folder (logic moves into hook)

## Phase 5 – `atenciones` module
- [x] `types/index.ts`: fix `Atencion` (add `business_id`, `signos_vitales` JSONB, `perfil_id` per spec), remove local BaseEntity/SyncStatus
- [x] `hooks/useAtenciones.ts`: migrate to `useDexieCrud<Atencion>` with transaction for movimientos
- [x] Delete `repositories/` folder

## Phase 6 – Core barrel cleanup
- [x] `core/entities/index.ts`: verify all re-exports still resolve correctly
