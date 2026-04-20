'use client';

import { Search, Calendar, X, Filter, UserCircle, AlertCircle } from 'lucide-react';
import type { AtencionesFilterBarProps } from '../types/filters';

/**
 * Barra de filtros para lista de atenciones - Diseño consistente con la app
 *
 * Características:
 * - Paleta slate consistente con MovementTable y SearchFilter
 * - Inputs con ring focus y bordes redondeados (rounded-xl)
 * - Layout compacto con iconos integrados
 * - Badge de paciente activo con estilo premium
 */
export function AtencionesFilterBar({
  filters,
  onSearchTermChange,
  onFechaDesdeChange,
  onFechaHastaChange,
  onReset,
  hasActiveFilters,
  isDateRangeInvalid,
  resultCount,
}: AtencionesFilterBarProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header con título y contador */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
            <Filter size={16} className="text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Filtros de búsqueda
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {resultCount} atenciones encontradas
            </p>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
          >
            <X size={16} />
            Limpiar
          </button>
        )}
      </div>

      {/* Filtros - Apilados en móvil, en línea en desktop */}
      <div className="space-y-3">
        {/* Búsqueda textual - Full width en todos los tamaños */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por paciente o motivo..."
            value={filters.searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:py-2.5 sm:text-sm"
          />
          {filters.searchTerm && (
            <button
              onClick={() => onSearchTermChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Fechas - Apiladas en móvil, lado a lado en sm+ */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Calendar className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDateRangeInvalid ? 'text-rose-400' : 'text-slate-400'}`} />
            <input
              type="date"
              value={filters.fechaDesde || ''}
              onChange={(e) => onFechaDesdeChange(e.target.value || null)}
              className={`w-full min-w-0 rounded-xl border bg-white py-3 pl-10 pr-3 text-base text-slate-900 focus:ring-4 outline-none transition-all dark:bg-slate-900 dark:text-slate-100 sm:py-2.5 sm:text-sm ${isDateRangeInvalid
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-700'
                  : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 dark:border-slate-700'
                }`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-xs text-slate-400 sm:block">
              Desde
            </span>
          </div>
          <div className="relative flex-1">
            <Calendar className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDateRangeInvalid ? 'text-rose-400' : 'text-slate-400'}`} />
            <input
              type="date"
              value={filters.fechaHasta || ''}
              onChange={(e) => onFechaHastaChange(e.target.value || null)}
              className={`w-full min-w-0 rounded-xl border bg-white py-3 pl-10 pr-3 text-base text-slate-900 focus:ring-4 outline-none transition-all dark:bg-slate-900 dark:text-slate-100 sm:py-2.5 sm:text-sm ${isDateRangeInvalid
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-700'
                  : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 dark:border-slate-700'
                }`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-xs text-slate-400 sm:block">
              Hasta
            </span>
          </div>
        </div>

        {/* Error de rango de fechas inválido */}
        {isDateRangeInvalid && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertCircle size={16} />
            <span>La fecha inicial no puede ser posterior a la fecha final</span>
          </div>
        )}
      </div>

      {/* Filtro activo: Paciente */}
      {filters.pacienteId && (
        <div className="flex items-center justify-between rounded-xl bg-teal-50 px-4 py-3 dark:bg-teal-900/20">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-800">
              <UserCircle size={14} className="text-teal-600 dark:text-teal-400" />
            </div>
            <span className="text-sm font-medium text-teal-900 dark:text-teal-100">
              Filtrando historial del paciente
            </span>
          </div>
          <button
            onClick={() => onReset()}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-100 dark:text-teal-300 dark:hover:bg-teal-800/50"
          >
            <X size={14} />
            Quitar filtro
          </button>
        </div>
      )}
    </div>
  );
}
