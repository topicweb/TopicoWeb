'use client';

import { useAtenciones } from '@/features/atenciones/hooks/useAtenciones';
import { useAtencionesFilter } from '@/features/atenciones/hooks/useAtencionesFilter';
import { AtencionesFilterBar } from '@/features/atenciones/components/AtencionesFilterBar';
import { AtencionCard } from '@/features/atenciones/components/AtencionCard';
import Link from 'next/link';
import { Plus, FileText, Stethoscope } from 'lucide-react';

/**
 * Página de listado de atenciones médicas
 *
 * Características:
 * - Filtrado por rango de fechas, paciente específico y búsqueda textual
 * - Flujo "Ver historial": clic en nombre del paciente para filtrar sus atenciones
 * - UI responsiva con filtros en barra dedicada
 */
export default function AttentionsPage() {
  const { atencionesConDetalles, isLoading } = useAtenciones();
  const {
    filteredData,
    filters,
    setSearchTerm,
    setFechaDesde,
    setFechaHasta,
    setPacienteId,
    resetFilters,
    hasActiveFilters,
    resultCount,
  } = useAtencionesFilter(atencionesConDetalles);

  /**
   * Handler para ver historial de un paciente específico
   * Se activa al hacer clic en el nombre del paciente en cualquier card
   */
  const handleViewHistorial = (pacienteId: string, pacienteNombre: string) => {
    setPacienteId(pacienteId);
    // Scroll al top para mostrar el indicador de filtro activo
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Atenciones y Consultas
            </h1>
            <div className="mt-1 h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Atenciones y Consultas
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {atencionesConDetalles.length} atenciones registradas en total
          </p>
        </div>
        <Link
          href="/dashboard/attentions/new"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md focus:ring-4 focus:ring-teal-500/20 active:scale-95 dark:bg-teal-500 dark:hover:bg-teal-400"
        >
          <Plus size={20} />
          Nueva Atención
        </Link>
      </div>

      {/* Barra de filtros */}
      <AtencionesFilterBar
        filters={filters}
        onSearchTermChange={setSearchTerm}
        onFechaDesdeChange={setFechaDesde}
        onFechaHastaChange={setFechaHasta}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
        resultCount={resultCount}
      />

      {/* Grid de atenciones */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredData.map((atencion, index) => (
          <AtencionCard
            key={atencion.id}
            atencion={atencion}
            index={index}
            onViewHistorial={handleViewHistorial}
          />
        ))}
      </div>

      {/* Estados vacíos */}
      {filteredData.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          {hasActiveFilters ? (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <FileText size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                No se encontraron atenciones
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Intenta ajustar los filtros o{' '}
                <button
                  onClick={resetFilters}
                  className="font-medium text-teal-600 hover:text-teal-700 hover:underline dark:text-teal-400"
                >
                  limpiar todos
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 dark:bg-teal-900/30">
                <Stethoscope size={32} className="text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Sin atenciones registradas
              </h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Comienza registrando una nueva atención médica para tus pacientes
              </p>
              <Link
                href="/dashboard/attentions/new"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md active:scale-95 dark:bg-teal-500 dark:hover:bg-teal-400"
              >
                <Plus size={18} />
                Registrar primera atención
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
