// ───────────────────────────────────────────────────────────────────────────────
// COMPONENTE: ReporteButton
// Botón para descargar reporte mensual de atenciones en PDF
// Reemplaza el botón "Test E2E" anterior
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { FileDown, Eye, Loader2 } from "lucide-react";
import type { AtencionConDetallesExtendida } from "../types";
import { useReportePdf } from "../hooks/useReportePdf";
import { getMesAñoActual } from "../utils/reporteFilters";

interface ReporteButtonProps {
  atenciones: AtencionConDetallesExtendida[];
  mostrarPreview?: boolean;
}

/**
 * Botón para descargar reporte mensual de atenciones en PDF
 * Genera tabla con todos los datos de las atenciones del mes actual
 */
export function ReporteButton({
  atenciones,
  mostrarPreview = true,
}: ReporteButtonProps) {
  const { generando, descargarReporteMesActual, previsualizarMesActual } =
    useReportePdf();
  const { display: mesActual } = getMesAñoActual();

  const handleDescargar = async () => {
    await descargarReporteMesActual(atenciones);
  };

  const handlePreview = async () => {
    await previsualizarMesActual(atenciones);
  };

  return (
    <div className="flex gap-2">
      {/* Botón Descargar PDF */}
      <button
        onClick={handleDescargar}
        disabled={generando || atenciones.length === 0}
        className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-success/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        title={`Descargar reporte de ${mesActual}`}
      >
        {generando ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Generando...
          </>
        ) : (
          <>
            <FileDown size={18} />
            <span className="hidden sm:inline">Reporte PDF</span>
          </>
        )}
      </button>

      {/* Botón Vista Previa (solo en desktop o si mostrarPreview es true) */}
      {mostrarPreview && (
        <button
          onClick={handlePreview}
          disabled={generando || atenciones.length === 0}
          className="hidden items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex"
          title="Abrir vista previa"
        >
          <Eye size={18} />
          <span>Vista previa</span>
        </button>
      )}

      {/* Información del mes */}
      <div className="hidden flex-col items-end justify-center px-2 text-right sm:flex">
        <div className="text-xs font-medium text-muted">Mes actual</div>
        <div className="text-sm font-semibold text-foreground">{mesActual}</div>
      </div>
    </div>
  );
}
