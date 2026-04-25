// ───────────────────────────────────────────────────────────────────────────────
// TIPOS PARA FILTROS DE ATENCIONES
// Define la estructura de estado y retorno del hook useAtencionesFilter
// ───────────────────────────────────────────────────────────────────────────────

import type { AtencionConDetallesExtendida } from './index';

// ───────────────────────────────────────────────────────────────────────────────
// Estado de los filtros
// ───────────────────────────────────────────────────────────────────────────────
export interface AtencionesFilterState {
  searchTerm: string;
  fechaDesde: string | null;
  fechaHasta: string | null;
  pacienteId: string | null;
}

// ───────────────────────────────────────────────────────────────────────────────
// Retorno del hook useAtencionesFilter con datos filtrados y controladores
// ───────────────────────────────────────────────────────────────────────────────

export interface UseAtencionesFilterReturn {
  filteredData: AtencionConDetallesExtendida[];
  filters: AtencionesFilterState;
  setSearchTerm: (term: string) => void;
  setFechaDesde: (date: string | null) => void;
  setFechaHasta: (date: string | null) => void;
  setPacienteId: (id: string | null) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  isDateRangeInvalid: boolean;
  resultCount: number;
}

// ───────────────────────────────────────────────────────────────────────────────
// Props para componentes de filtro que reciben el estado y setters
// ───────────────────────────────────────────────────────────────────────────────

export interface AtencionesFilterBarProps {
  filters: AtencionesFilterState;
  onSearchTermChange: (term: string) => void;
  onFechaDesdeChange: (date: string | null) => void;
  onFechaHastaChange: (date: string | null) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  isDateRangeInvalid: boolean;
  resultCount: number;
}
