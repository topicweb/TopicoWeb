// ── Domain Types ───────────────────────────────────────────────────────────────

export type {
  Atencion,
  AtencionFormData,
  AtencionExtendida,
  AtencionConDetalles,
  SignosVitales,
  DispensacionMedicamento,
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
export { useAtencionesFilter, type UseAtencionesFilterReturn } from './hooks/useAtencionesFilter';
export { useReportePdf, type UseReportePdfReturn } from './hooks/useReportePdf';

// ── Components ──────────────────────────────────────────────────────────────────

export { MedicineDispenser } from './components/MedicineDispenser';
export { AtencionModal } from './components/AtencionModal';
export { SignosVitalesInput } from './components/SignosVitalesInput';
export { AtencionesFilterBar } from './components/AtencionesFilterBar';
export { AtencionCard } from './components/AtencionCard';
export { ReporteButton } from './components/ReporteButton';

// ── Utils (Reportes) ────────────────────────────────────────────────────────────

export {
  filtrarAtencionesPorMesActual,
  filtrarAtencionesPorMes,
  getNombreMes,
  formatearFecha,
  getMesAñoActual,
} from './utils/reporteFilters';
export { generarReportePDF, descargarPDF, previewPDF } from './utils/reportePdfGenerator';

// ── Filter Types ────────────────────────────────────────────────────────────────

export type { AtencionesFilterState, AtencionesFilterBarProps } from './types/filters';
