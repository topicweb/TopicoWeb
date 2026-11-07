'use client';

import { useState } from 'react';
import {
  Search,
  Calendar,
  X,
  Filter,
  UserCircle,
  AlertCircle,
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  Sparkles,
  Stethoscope,
  Code,
} from 'lucide-react';
import type { AtencionesFilterBarProps } from '../types/filters';

export function AtencionesFilterBar({
  filters,
  onSearchTermChange,
  onFechaDesdeChange,
  onFechaHastaChange,
  onGrupoChange,
  onReset,
  hasActiveFilters,
  isDateRangeInvalid,
  resultCount,
}: AtencionesFilterBarProps) {
  const [focusedDesde, setFocusedDesde] = useState(false);
  const [focusedHasta, setFocusedHasta] = useState(false);

  const isAlumnoGroup =
    filters.grupo === 'alumno' ||
    filters.grupo === 'enfermeria' ||
    filters.grupo === 'desarrollo_sistemas';

  return (
    <div className="glass-card space-y-4 p-5">
      {/* Encabezado de filtros */}
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
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-[var(--danger-soft)]"
          >
            <X size={16} />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Buscador y Rango de Fechas */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <input
            type="text"
            placeholder="Buscar por paciente, DNI, motivo o diagnóstico..."
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

        {/* Inputs de fecha limpios y sin solapamiento */}
        <div className="flex flex-col gap-2.5 sm:flex-row">
          {/* Fecha Desde */}
          <div className="relative flex-1">
            <Calendar
              className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${
                isDateRangeInvalid
                  ? 'text-danger'
                  : filters.fechaDesde || focusedDesde
                  ? 'text-primary'
                  : 'text-muted'
              }`}
            />
            <input
              type={focusedDesde || filters.fechaDesde ? 'date' : 'text'}
              placeholder="Fecha desde"
              value={filters.fechaDesde || ''}
              onFocus={(e) => {
                setFocusedDesde(true);
                try {
                  e.target.showPicker?.();
                } catch {}
              }}
              onBlur={() => setFocusedDesde(false)}
              onChange={(e) => onFechaDesdeChange(e.target.value || null)}
              className={`input-premium w-full min-w-0 py-2.5 pl-10 text-sm transition-all ${
                filters.fechaDesde ? 'pr-9' : 'pr-3'
              } ${isDateRangeInvalid ? 'border-danger focus:border-danger' : ''}`}
            />
            {filters.fechaDesde && (
              <button
                type="button"
                onClick={() => onFechaDesdeChange(null)}
                className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--slate-400)] transition-colors hover:bg-muted hover:text-foreground"
                title="Quitar fecha desde"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Fecha Hasta */}
          <div className="relative flex-1">
            <Calendar
              className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${
                isDateRangeInvalid
                  ? 'text-danger'
                  : filters.fechaHasta || focusedHasta
                  ? 'text-primary'
                  : 'text-muted'
              }`}
            />
            <input
              type={focusedHasta || filters.fechaHasta ? 'date' : 'text'}
              placeholder="Fecha hasta"
              value={filters.fechaHasta || ''}
              onFocus={(e) => {
                setFocusedHasta(true);
                try {
                  e.target.showPicker?.();
                } catch {}
              }}
              onBlur={() => setFocusedHasta(false)}
              onChange={(e) => onFechaHastaChange(e.target.value || null)}
              className={`input-premium w-full min-w-0 py-2.5 pl-10 text-sm transition-all ${
                filters.fechaHasta ? 'pr-9' : 'pr-3'
              } ${isDateRangeInvalid ? 'border-danger focus:border-danger' : ''}`}
            />
            {filters.fechaHasta && (
              <button
                type="button"
                onClick={() => onFechaHastaChange(null)}
                className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--slate-400)] transition-colors hover:bg-muted hover:text-foreground"
                title="Quitar fecha hasta"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {isDateRangeInvalid && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger">
            <AlertCircle size={16} />
            <span>La fecha inicial no puede ser posterior a la fecha final</span>
          </div>
        )}
      </div>

      {/* Filtros por Categoría / Estamento */}
      <div className="space-y-2.5 border-t border-border pt-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Filtrar por estamento
          </span>
          {filters.grupo !== 'todos' && (
            <button
              type="button"
              onClick={() => onGrupoChange('todos')}
              className="text-xs font-medium text-primary hover:underline"
            >
              Restablecer estamento
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Todos */}
          <button
            type="button"
            onClick={() => onGrupoChange('todos')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              filters.grupo === 'todos'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-muted text-foreground hover:bg-[var(--slate-200)]'
            }`}
          >
            <Users size={14} />
            Todos
          </button>

          {/* Alumnos */}
          <button
            type="button"
            onClick={() => onGrupoChange(isAlumnoGroup ? 'todos' : 'alumno')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              isAlumnoGroup
                ? 'bg-primary text-white shadow-sm'
                : 'bg-muted text-foreground hover:bg-[var(--slate-200)]'
            }`}
          >
            <GraduationCap size={14} />
            Alumnos
          </button>

          {/* Docentes */}
          <button
            type="button"
            onClick={() => onGrupoChange('docente')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              filters.grupo === 'docente'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-muted text-foreground hover:bg-[var(--slate-200)]'
            }`}
          >
            <BookOpen size={14} />
            Docentes
          </button>

          {/* Administrativos */}
          <button
            type="button"
            onClick={() => onGrupoChange('administrativo')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              filters.grupo === 'administrativo'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-muted text-foreground hover:bg-[var(--slate-200)]'
            }`}
          >
            <Building2 size={14} />
            Administrativos
          </button>

          {/* Limpieza */}
          <button
            type="button"
            onClick={() => onGrupoChange('limpieza')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              filters.grupo === 'limpieza'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-muted text-foreground hover:bg-[var(--slate-200)]'
            }`}
          >
            <Sparkles size={14} />
            Limpieza
          </button>
        </div>

        {/* Sub-filtro para Alumnos (General, Enfermería, Desarrollo de Sistemas) */}
        {isAlumnoGroup && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-[var(--primary-soft)]/40 p-2.5 text-xs animate-in fade-in duration-200">
            <span className="font-semibold text-primary text-[11px] px-1">
              Carrera / Programa:
            </span>
            <button
              type="button"
              onClick={() => onGrupoChange('alumno')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition-all ${
                filters.grupo === 'alumno'
                  ? 'bg-primary text-white font-semibold shadow-xs'
                  : 'bg-card text-muted hover:text-foreground border border-border'
              }`}
            >
              <Users size={12} />
              Todos los alumnos
            </button>
            <button
              type="button"
              onClick={() => onGrupoChange('enfermeria')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition-all ${
                filters.grupo === 'enfermeria'
                  ? 'bg-primary text-white font-semibold shadow-xs'
                  : 'bg-card text-muted hover:text-foreground border border-border'
              }`}
            >
              <Stethoscope size={12} />
              Enfermería Técnica
            </button>
            <button
              type="button"
              onClick={() => onGrupoChange('desarrollo_sistemas')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition-all ${
                filters.grupo === 'desarrollo_sistemas'
                  ? 'bg-primary text-white font-semibold shadow-xs'
                  : 'bg-card text-muted hover:text-foreground border border-border'
              }`}
            >
              <Code size={12} />
              Desarrollo de Sistemas
            </button>
          </div>
        )}
      </div>

      {/* Banner de filtro por historial de paciente específico */}
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
