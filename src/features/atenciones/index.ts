// ── Domain Types ───────────────────────────────────────────────────────────────

export type {
  Atencion,
  AtencionFormData,
  AtencionExtendida,
  AtencionProcesada,
  AtencionConDetalles,
  SignosVitales,
  DispensacionMedicamento,
  ConfiguracionAgrupacion,
  AtencionContext,
  AtencionResultado,
  AtencionRepository,
} from './types';

export { SIGNOS_VITALES_VACIO, AtencionError } from './types';

// ── Repository (Data Layer) ────────────────────────────────────────────────────

export {
  DexieAtencionRepository,
  atencionRepository,
} from './data';

// ── Presentation Hooks ─────────────────────────────────────────────────────────

export { useAtenciones, type UseAtencionesReturn } from './hooks/useAtenciones';
export { useLazyMovimientos, useInfiniteScroll } from './hooks/useLazyMovimientos';

// ── Components ──────────────────────────────────────────────────────────────────

export { MedicineDispenser } from './components/MedicineDispenser';
export { AtencionModal } from './components/AtencionModal';
export { SignosVitalesInput } from './components/SignosVitalesInput';
