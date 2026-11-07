// ───────────────────────────────────────────────────────────────────────────────
// COMPONENTE: ReporteButton
// Botón para descargar reporte mensual de atenciones en PDF
// Con soporte para filtrado por estamento/grupo y regla de gracia de 3 días
// ───────────────────────────────────────────────────────────────────────────────

'use client';

import { useState, useMemo } from 'react';
import { FileDown, Eye, Loader2, Calendar } from 'lucide-react';
import type { AtencionConDetallesExtendida } from '../types';
import type { FiltroGrupoAtencion } from '../types/filters';
import { useReportePdf } from '../hooks/useReportePdf';
import {
  getPeriodoReporteConGracia,
  filtrarAtencionesPorGrupo,
  filtrarAtencionesPorMes,
  getEtiquetaGrupo,
  getNombreMes,
} from '../utils/reporteFilters';

interface ReporteButtonProps {
  atenciones: AtencionConDetallesExtendida[];
  filtroGrupo?: FiltroGrupoAtencion;
  mostrarPreview?: boolean;
}

/**
 * Genera la lista de los últimos 12 meses disponibles para seleccionar
 */
function generarOpcionesMeses(fechaReferencia: Date = new Date()): { mes: number; año: number; display: string }[] {
  const opciones = [];
  const añoActual = fechaReferencia.getFullYear();
  const mesActual = fechaReferencia.getMonth(); // 0-11

  for (let i = 0; i < 12; i++) {
    const d = new Date(añoActual, mesActual - i, 1);
    const m = d.getMonth() + 1;
    const a = d.getFullYear();
    opciones.push({
      mes: m,
      año: a,
      display: `${getNombreMes(m)} ${a}`,
    });
  }
  return opciones;
}

/**
 * Botón para descargar reporte de atenciones en PDF
 * Aplica regla de 3 días para mes anterior por defecto y respeta el filtro activo
 */
export function ReporteButton({
  atenciones,
  filtroGrupo = 'todos',
  mostrarPreview = true,
}: ReporteButtonProps) {
  const { generando, descargarReportePeriodo, previsualizarPeriodo } = useReportePdf();

  // Período por defecto según la regla de gracia de 3 días
  const periodoPorDefecto = useMemo(() => getPeriodoReporteConGracia(), []);
  const opcionesMeses = useMemo(() => generarOpcionesMeses(), []);

  const [mesSeleccionado, setMesSeleccionado] = useState(periodoPorDefecto.mes);
  const [añoSeleccionado, setAñoSeleccionado] = useState(periodoPorDefecto.año);

  // Etiqueta del filtro activo (ej: "Alumnos - Enfermería Técnica")
  const etiquetaFiltro = useMemo(() => getEtiquetaGrupo(filtroGrupo), [filtroGrupo]);

  // Atenciones filtradas por el grupo activo
  const atencionesGrupo = useMemo(
    () => filtrarAtencionesPorGrupo(atenciones, filtroGrupo),
    [atenciones, filtroGrupo]
  );

  // Atenciones del mes y año seleccionado para el grupo
  const atencionesDelPeriodo = useMemo(
    () => filtrarAtencionesPorMes(atencionesGrupo, mesSeleccionado, añoSeleccionado),
    [atencionesGrupo, mesSeleccionado, añoSeleccionado]
  );

  const nombreMesSeleccionado = `${getNombreMes(mesSeleccionado)} ${añoSeleccionado}`;

  const handleDescargar = async () => {
    await descargarReportePeriodo(atencionesGrupo, {
      mes: mesSeleccionado,
      año: añoSeleccionado,
      etiquetaFiltro: filtroGrupo !== 'todos' ? etiquetaFiltro : undefined,
    });
  };

  const handlePreview = async () => {
    await previsualizarPeriodo(atencionesGrupo, {
      mes: mesSeleccionado,
      año: añoSeleccionado,
      etiquetaFiltro: filtroGrupo !== 'todos' ? etiquetaFiltro : undefined,
    });
  };

  const disabled = generando || atencionesDelPeriodo.length === 0;

  return (
    <div className="flex items-center gap-2">
      {/* Botón Descargar PDF */}
      <button
        type="button"
        onClick={handleDescargar}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-success/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        title={`Descargar reporte de ${nombreMesSeleccionado}${
          filtroGrupo !== 'todos' ? ` (${etiquetaFiltro})` : ''
        } - ${atencionesDelPeriodo.length} registros`}
      >
        {generando ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Generando...</span>
          </>
        ) : (
          <>
            <FileDown size={18} />
            <span className="hidden sm:inline">Reporte PDF</span>
          </>
        )}
      </button>

      {/* Botón Vista Previa */}
      {mostrarPreview && (
        <button
          type="button"
          onClick={handlePreview}
          disabled={disabled}
          className="hidden items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex"
          title="Abrir vista previa del reporte"
        >
          <Eye size={18} />
          <span>Vista previa</span>
        </button>
      )}

      {/* Selector e información del período */}
      <div className="hidden flex-col items-end justify-center px-1 text-right sm:flex">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
          <Calendar size={12} className="text-primary" />
          <span>Período</span>
          {periodoPorDefecto.esMesAnterior &&
            mesSeleccionado === periodoPorDefecto.mes &&
            añoSeleccionado === periodoPorDefecto.año && (
              <span
                className="rounded bg-accent/15 px-1 py-0.2 text-[9.5px] font-bold text-accent"
                title="Regla de prórroga: durante los primeros 3 días del mes se reporta el mes anterior"
              >
                Gracia 3d
              </span>
            )}
        </div>

        <select
          value={`${mesSeleccionado}-${añoSeleccionado}`}
          onChange={(e) => {
            const [m, a] = e.target.value.split('-').map(Number);
            setMesSeleccionado(m);
            setAñoSeleccionado(a);
          }}
          className="cursor-pointer bg-transparent text-sm font-bold text-foreground hover:text-primary transition-colors focus:outline-hidden"
          title="Cambiar mes para el reporte"
        >
          {opcionesMeses.map((op) => (
            <option
              key={`${op.mes}-${op.año}`}
              value={`${op.mes}-${op.año}`}
              className="bg-card text-foreground"
            >
              {op.display}
            </option>
          ))}
        </select>

        {filtroGrupo !== 'todos' ? (
          <span
            className="text-[11px] font-medium text-primary line-clamp-1 max-w-[160px]"
            title={`Filtro activo: ${etiquetaFiltro}`}
          >
            {etiquetaFiltro} ({atencionesDelPeriodo.length})
          </span>
        ) : (
          <span className="text-[11px] text-muted">
            {atencionesDelPeriodo.length} atenciones
          </span>
        )}
      </div>
    </div>
  );
}
