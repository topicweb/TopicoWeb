/**
 * Tipos para el sistema de filtros de atenciones
 * Define la estructura de estado y retorno del hook useAtencionesFilter
 */

import type { AtencionConDetalles } from './index';

/**
 * Estado completo de los filtros aplicables a la lista de atenciones
 */
export interface AtencionesFilterState {
  /** Término de búsqueda textual (paciente o motivo) */
  searchTerm: string;
  /** Fecha inicial del rango (ISO string YYYY-MM-DD) */
  fechaDesde: string | null;
  /** Fecha final del rango (ISO string YYYY-MM-DD) */
  fechaHasta: string | null;
  /** ID del paciente para filtrar historial específico (null = todos) */
  pacienteId: string | null;
}

/**
 * Retorno del hook useAtencionesFilter con datos filtrados y controladores
 */
export interface UseAtencionesFilterReturn {
  /** Lista de atenciones después de aplicar todos los filtros */
  filteredData: AtencionConDetalles[];
  /** Estado actual de los filtros */
  filters: AtencionesFilterState;
  /** Actualizar término de búsqueda */
  setSearchTerm: (term: string) => void;
  /** Establecer fecha inicial del rango */
  setFechaDesde: (date: string | null) => void;
  /** Establecer fecha final del rango */
  setFechaHasta: (date: string | null) => void;
  /** Filtrar por paciente específico (para historial) */
  setPacienteId: (id: string | null) => void;
  /** Limpiar todos los filtros a valores por defecto */
  resetFilters: () => void;
  /** Indica si hay algún filtro activo (no default) */
  hasActiveFilters: boolean;
  /** Indica si el rango de fechas es inválido (desde > hasta) */
  isDateRangeInvalid: boolean;
  /** Cantidad de resultados después del filtrado */
  resultCount: number;
}

/**
 * Props para componentes de filtro que reciben el estado y setters
 */
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
