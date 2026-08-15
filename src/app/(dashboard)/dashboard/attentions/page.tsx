"use client";

import { useAtenciones } from "@/features/atenciones/hooks/useAtenciones";
import { useAtencionesFilter } from "@/features/atenciones/hooks/useAtencionesFilter";
import { AtencionesFilterBar } from "@/features/atenciones/components/AtencionesFilterBar";
import { AtencionCard } from "@/features/atenciones/components/AtencionCard";
import { ReporteButton } from "@/features/atenciones/components/ReporteButton";
import Link from "next/link";
import { Plus, FileText, Stethoscope } from "lucide-react";

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
    isDateRangeInvalid,
    resultCount,
  } = useAtencionesFilter(atencionesConDetalles);

  const handleViewHistorial = (pacienteId: string, _pacienteNombre: string) => {
    setPacienteId(pacienteId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Atenciones y Consultas
            </h1>
            <div className="mt-1 h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-10 w-40 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Atenciones y <span className="text-gradient">Consultas</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            {atencionesConDetalles.length} atenciones registradas en total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ReporteButton atenciones={atencionesConDetalles} />
          <Link
            href="/dashboard/attentions/new"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover active:scale-[0.98]"
          >
            <Plus size={20} />
            Nueva Atención
          </Link>
        </div>
      </div>

      <AtencionesFilterBar
        filters={filters}
        onSearchTermChange={setSearchTerm}
        onFechaDesdeChange={setFechaDesde}
        onFechaHastaChange={setFechaHasta}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
        isDateRangeInvalid={isDateRangeInvalid}
        resultCount={resultCount}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {filteredData.map((atencion, index) => (
          <AtencionCard
            key={atencion.id}
            atencion={atencion}
            index={index}
            onViewHistorial={handleViewHistorial}
          />
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted p-12 text-center">
          {hasActiveFilters ? (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary-soft)]">
                <FileText size={32} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                No se encontraron atenciones
              </h3>
              <p className="mt-1 text-sm text-muted">
                Intenta ajustar los filtros o{" "}
                <button
                  onClick={resetFilters}
                  className="font-medium text-accent hover:underline"
                >
                  limpiar todos
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)]">
                <Stethoscope size={32} className="text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Sin atenciones registradas
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Comienza registrando una nueva atención médica para tus
                pacientes
              </p>
              <Link
                href="/dashboard/attentions/new"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover active:scale-[0.98]"
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
