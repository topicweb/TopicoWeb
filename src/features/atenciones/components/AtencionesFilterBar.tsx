'use client';

import { Search, Calendar, X, Filter, UserCircle, AlertCircle } from 'lucide-react';
import type { AtencionesFilterBarProps } from '../types/filters';

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
    <div className="glass-card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-soft)]">
            <Filter size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Filtros de búsqueda</h3>
            <p className="text-xs text-muted">{resultCount} atenciones encontradas</p>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-[var(--danger-soft)]"
          >
            <X size={16} />
            Limpiar
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <input
            type="text"
            placeholder="Buscar por paciente o motivo..."
            value={filters.searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="input-premium w-full min-w-0 py-2.5 pl-10 pr-10 text-sm sm:text-sm"
          />
          {filters.searchTerm && (
            <button
              type="button"
              onClick={() => onSearchTermChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[var(--slate-400)] transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Calendar className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDateRangeInvalid ? 'text-danger' : 'text-[var(--slate-400)]'}`} />
            <input
              type="date"
              value={filters.fechaDesde || ''}
              onChange={(e) => onFechaDesdeChange(e.target.value || null)}
              className={`input-premium w-full min-w-0 py-2.5 pl-10 pr-3 text-sm ${isDateRangeInvalid ? 'border-danger focus:border-danger' : ''}`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-xs text-muted sm:block">
              Desde
            </span>
          </div>
          <div className="relative flex-1">
            <Calendar className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDateRangeInvalid ? 'text-danger' : 'text-[var(--slate-400)]'}`} />
            <input
              type="date"
              value={filters.fechaHasta || ''}
              onChange={(e) => onFechaHastaChange(e.target.value || null)}
              className={`input-premium w-full min-w-0 py-2.5 pl-10 pr-3 text-sm ${isDateRangeInvalid ? 'border-danger focus:border-danger' : ''}`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-xs text-muted sm:block">
              Hasta
            </span>
          </div>
        </div>

        {isDateRangeInvalid && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger">
            <AlertCircle size={16} />
            <span>La fecha inicial no puede ser posterior a la fecha final</span>
          </div>
        )}
      </div>

      {filters.pacienteId && (
        <div className="flex items-center justify-between rounded-xl bg-[var(--accent-soft)] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-muted)]">
              <UserCircle size={14} className="text-accent" />
            </div>
            <span className="text-sm font-medium text-accent">Filtrando historial del paciente</span>
          </div>
          <button
            type="button"
            onClick={() => onReset()}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-accent transition-colors hover:bg-[var(--accent-muted)]"
          >
            <X size={14} />
            Quitar filtro
          </button>
        </div>
      )}
    </div>
  );
}
