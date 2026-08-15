'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { AtencionConDetallesExtendida } from '../types';
import type { AtencionesFilterState } from '../types/filters';

export type { UseAtencionesFilterReturn } from '../types/filters';
import type { UseAtencionesFilterReturn as UseAtencionesFilterReturnType } from '../types/filters';

// ───────────────────────────────────────────────────────────────────────────────
// HOOK DE FILTRO DE ATENCIONES
// Filtrado avanzado de atenciones con debounce y memoización
// ───────────────────────────────────────────────────────────────────────────────

const defaultFilters: AtencionesFilterState = {
  searchTerm: '',
  fechaDesde: null,
  fechaHasta: null,
  pacienteId: null,
};

export function useAtencionesFilter(
  atenciones: AtencionConDetallesExtendida[]
): UseAtencionesFilterReturnType {
  const [filters, setFilters] = useState<AtencionesFilterState>(defaultFilters);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(filters.searchTerm);

  // ── RENDIMIENTO: DEBOUNCE ───────────────────────────────────────────────────────

  // Debounce para búsqueda (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(filters.searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.searchTerm]);

  // ── SETTERS DE FILTRO ─────────────────────────────────────────────────────────────

  const setSearchTerm = useCallback((term: string) => {
    setFilters((prev) => ({ ...prev, searchTerm: term }));
  }, []);

  const setFechaDesde = useCallback((date: string | null) => {
    setFilters((prev) => ({ ...prev, fechaDesde: date }));
  }, []);

  const setFechaHasta = useCallback((date: string | null) => {
    setFilters((prev) => ({ ...prev, fechaHasta: date }));
  }, []);

  const setPacienteId = useCallback((id: string | null) => {
    setFilters((prev) => ({ ...prev, pacienteId: id }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // ── VALIDACIÓN DE FILTRO ─────────────────────────────────────────────────────────

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchTerm !== '' ||
      filters.fechaDesde !== null ||
      filters.fechaHasta !== null ||
      filters.pacienteId !== null
    );
  }, [filters]);

  const isDateRangeInvalid = useMemo(() => {
    if (!filters.fechaDesde || !filters.fechaHasta) return false;
    return new Date(filters.fechaDesde) > new Date(filters.fechaHasta);
  }, [filters.fechaDesde, filters.fechaHasta]);

  // ── LÓGICA DE FILTRADO ─────────────────────────────────────────────────────────────

  const filteredData = useMemo(() => {
    const resultados = atenciones.filter((atencion) => {
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

      // Filtro por término de búsqueda (paciente, DNI o motivo)
      if (debouncedSearchTerm) {
        const term = debouncedSearchTerm.toLowerCase();
        const matchesPaciente = atencion.pacienteNombre.toLowerCase().includes(term);
        const matchesDNI = atencion.pacienteDNI?.toLowerCase().includes(term);
        const matchesMotivo = atencion.motivo_consulta.toLowerCase().includes(term);
        if (!matchesPaciente && !matchesDNI && !matchesMotivo) {
          return false;
        }
      }

      return true;
    });

    return [...resultados].sort((a, b) => {
      const aTime = new Date(a.fecha_atencion || a.creado_at || 0).getTime();
      const bTime = new Date(b.fecha_atencion || b.creado_at || 0).getTime();

      if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
        return Number(new Date(b.creado_at || 0).getTime() - new Date(a.creado_at || 0).getTime());
      }

      return bTime - aTime;
    });
  }, [atenciones, filters, debouncedSearchTerm]);

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
    isDateRangeInvalid,
    resultCount,
  };
}
