'use client';

import { useState, useMemo, useCallback } from 'react';
import type { AtencionConDetalles } from '../types';
import type { AtencionesFilterState } from '../types/filters';

export type { UseAtencionesFilterReturn } from '../types/filters';
import type { UseAtencionesFilterReturn as UseAtencionesFilterReturnType } from '../types/filters';

/**
 * Estado inicial por defecto de los filtros
 */
const defaultFilters: AtencionesFilterState = {
  searchTerm: '',
  fechaDesde: null,
  fechaHasta: null,
  pacienteId: null,
};

/**
 * Hook para filtrado de atenciones con múltiples criterios
 * 
 * Características:
 * - Filtrado por término de búsqueda (paciente o motivo)
 * - Filtrado por rango de fechas (desde/hasta)
 * - Filtrado por paciente específico (para ver historial)
 * - Resultados memoizados para optimizar performance
 * - API limpia para componentes UI
 * 
 * @param atenciones - Lista completa de atenciones a filtrar
 * @returns Estado filtrado y controladores
 */
export function useAtencionesFilter(
  atenciones: AtencionConDetalles[]
): UseAtencionesFilterReturnType {
  const [filters, setFilters] = useState<AtencionesFilterState>(defaultFilters);

  /**
   * Setter específico para término de búsqueda
   */
  const setSearchTerm = useCallback((term: string) => {
    setFilters((prev) => ({ ...prev, searchTerm: term }));
  }, []);

  /**
   * Setter para fecha inicial del rango
   */
  const setFechaDesde = useCallback((date: string | null) => {
    setFilters((prev) => ({ ...prev, fechaDesde: date }));
  }, []);

  /**
   * Setter para fecha final del rango
   */
  const setFechaHasta = useCallback((date: string | null) => {
    setFilters((prev) => ({ ...prev, fechaHasta: date }));
  }, []);

  /**
   * Setter para filtrar por paciente específico (historial)
   */
  const setPacienteId = useCallback((id: string | null) => {
    setFilters((prev) => ({ ...prev, pacienteId: id }));
  }, []);

  /**
   * Resetear todos los filtros a valores por defecto
   */
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  /**
   * Verifica si hay filtros activos (diferentes a default)
   */
  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchTerm !== '' ||
      filters.fechaDesde !== null ||
      filters.fechaHasta !== null ||
      filters.pacienteId !== null
    );
  }, [filters]);

  /**
   * Lógica principal de filtrado con useMemo para performance
   * Aplica filtros en cascada: paciente → fechas → búsqueda textual
   */
  const filteredData = useMemo(() => {
    return atenciones.filter((atencion) => {
      // Filtro por paciente específico (historial)
      if (filters.pacienteId && atencion.paciente_id !== filters.pacienteId) {
        return false;
      }

      // Filtro por rango de fechas
      if (filters.fechaDesde || filters.fechaHasta) {
        const fechaAtencion = new Date(atencion.fecha_atencion);

        if (filters.fechaDesde) {
          const desde = new Date(filters.fechaDesde);
          desde.setHours(0, 0, 0, 0);
          if (fechaAtencion < desde) return false;
        }

        if (filters.fechaHasta) {
          const hasta = new Date(filters.fechaHasta);
          hasta.setHours(23, 59, 59, 999);
          if (fechaAtencion > hasta) return false;
        }
      }

      // Filtro por término de búsqueda (paciente o motivo)
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const matchesPaciente = atencion.pacienteNombre.toLowerCase().includes(term);
        const matchesMotivo = atencion.motivo_consulta.toLowerCase().includes(term);
        if (!matchesPaciente && !matchesMotivo) {
          return false;
        }
      }

      return true;
    });
  }, [atenciones, filters]);

  const resultCount = filteredData.length;

  return {
    filteredData,
    filters,
    setSearchTerm,
    setFechaDesde,
    setFechaHasta,
    setPacienteId,
    resetFilters,
    hasActiveFilters,
    resultCount,
  };
}
