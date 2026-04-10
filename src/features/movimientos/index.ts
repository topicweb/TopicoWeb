// ── Domain Types ───────────────────────────────────────────────────────────────

export type {
  MovimientoConMedicamento,
  CrearMovimientoInput,
  RegistroMovimientoResult,
  FiltrosMovimiento,
  EstadisticaDispensacion,
  MovimientoRepository,
} from "./types";

// ── Repository (Data Layer) ────────────────────────────────────────────────────

export {
  DexieMovimientoRepository,
  movimientoRepository,
} from "./data/dexieMovimientoRepository";

// ── Presentation Hooks ─────────────────────────────────────────────────────────

export {
  useMovimientos,
  type MovimientosEstado,
  type UseMovimientosReturn,
} from "./hooks/useMovimientos";

// ── Presentation Components ────────────────────────────────────────────────────

export {
  MovementCard,
  MovementTable,
  SearchFilter,
  EmptyState,
  MovementSkeleton,
} from "./components";
