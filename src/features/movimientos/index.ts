// ───────────────────────────────────────────────────────────────────────────────
// TIPOS DE DOMINIO
// ───────────────────────────────────────────────────────────────────────────────

export type {
  MovimientoConMedicamento,
  CrearMovimientoInput,
  RegistroMovimientoResult,
  MovimientoRepository,
} from "./types";

// ───────────────────────────────────────────────────────────────────────────────
// REPOSITORIO (Data Layer)
// ───────────────────────────────────────────────────────────────────────────────

export {
  DexieMovimientoRepository,
  movimientoRepository,
} from "./data/dexieMovimientoRepository";

// ───────────────────────────────────────────────────────────────────────────────
// HOOKS DE PRESENTACIÓN
// ───────────────────────────────────────────────────────────────────────────────

export {
  useMovimientos,
  type MovimientosEstado,
  type UseMovimientosReturn,
} from "./hooks/useMovimientos";

// ───────────────────────────────────────────────────────────────────────────────
// COMPONENTES DE PRESENTACIÓN
// ───────────────────────────────────────────────────────────────────────────────

export {
  MovementCard,
  MovementTable,
  SearchFilter,
  EmptyState,
  MovementSkeleton,
} from "./components";
