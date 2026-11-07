// ───────────────────────────────────────────────────────────────────────────────
// HOOK: useReportePdf
// Maneja la generación y descarga de reportes PDF de atenciones
// ───────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { AtencionConDetallesExtendida } from '../types';
import {
  filtrarAtencionesPorMes,
  getPeriodoReporteConGracia,
  getNombreMes,
} from '../utils/reporteFilters';
import { generarReportePDF, descargarPDF, previewPDF } from '../utils/reportePdfGenerator';

export interface OpcionesReporte {
  mes?: number;
  año?: number;
  etiquetaFiltro?: string;
}

export interface UseReportePdfReturn {
  generando: boolean;
  error: string | null;
  descargarReportePeriodo: (
    atenciones: AtencionConDetallesExtendida[],
    opciones?: OpcionesReporte
  ) => Promise<void>;
  previsualizarPeriodo: (
    atenciones: AtencionConDetallesExtendida[],
    opciones?: OpcionesReporte
  ) => Promise<void>;
  descargarReporteMesActual: (atenciones: AtencionConDetallesExtendida[]) => Promise<void>;
  descargarReporteMes: (atenciones: AtencionConDetallesExtendida[], mes: number, año: number) => Promise<void>;
  previsualizarMesActual: (atenciones: AtencionConDetallesExtendida[]) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook para generar y descargar reportes PDF de atenciones
 * Incluye manejo de errores y validaciones
 */
export function useReportePdf(): UseReportePdfReturn {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = (err: unknown): string => {
    const mensaje = err instanceof Error ? err.message : 'Error al generar el reporte';
    setError(mensaje);
    toast.error(mensaje);
    console.error('[useReportePdf]', err);
    return mensaje;
  };

  /**
   * Descarga el reporte para el período seleccionado o el período por defecto con regla de 3 días
   */
  const descargarReportePeriodo = useCallback(
    async (atenciones: AtencionConDetallesExtendida[], opciones?: OpcionesReporte) => {
      setGenerando(true);
      setError(null);

      try {
        if (!atenciones || atenciones.length === 0) {
          throw new Error('No hay atenciones para generar el reporte');
        }

        let atencionesDelMes: AtencionConDetallesExtendida[];
        let mesAñoDisplay: string;

        if (opciones?.mes && opciones?.año) {
          atencionesDelMes = filtrarAtencionesPorMes(atenciones, opciones.mes, opciones.año);
          mesAñoDisplay = `${getNombreMes(opciones.mes)} ${opciones.año}`;
        } else {
          const periodo = getPeriodoReporteConGracia();
          atencionesDelMes = filtrarAtencionesPorMes(atenciones, periodo.mes, periodo.año);
          mesAñoDisplay = periodo.display;
        }

        if (atencionesDelMes.length === 0) {
          throw new Error(`No hay atenciones registradas en ${mesAñoDisplay}`);
        }

        const pdf = generarReportePDF(
          atencionesDelMes,
          mesAñoDisplay,
          'Tópico IESTPPA',
          opciones?.etiquetaFiltro
        );

        const slugMes = mesAñoDisplay.toLowerCase().replace(/\s+/g, '-');
        const slugFiltro = opciones?.etiquetaFiltro && opciones.etiquetaFiltro !== 'Todos'
          ? `-${opciones.etiquetaFiltro.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
          : '';

        descargarPDF(pdf, `reporte-atenciones${slugFiltro}-${slugMes}`);
        toast.success(`Reporte descargado: ${atencionesDelMes.length} atenciones`);
      } catch (err) {
        handleError(err);
      } finally {
        setGenerando(false);
      }
    },
    []
  );

  /**
   * Abre la vista previa del reporte
   */
  const previsualizarPeriodo = useCallback(
    async (atenciones: AtencionConDetallesExtendida[], opciones?: OpcionesReporte) => {
      setGenerando(true);
      setError(null);

      try {
        if (!atenciones || atenciones.length === 0) {
          throw new Error('No hay atenciones para generar el reporte');
        }

        let atencionesDelMes: AtencionConDetallesExtendida[];
        let mesAñoDisplay: string;

        if (opciones?.mes && opciones?.año) {
          atencionesDelMes = filtrarAtencionesPorMes(atenciones, opciones.mes, opciones.año);
          mesAñoDisplay = `${getNombreMes(opciones.mes)} ${opciones.año}`;
        } else {
          const periodo = getPeriodoReporteConGracia();
          atencionesDelMes = filtrarAtencionesPorMes(atenciones, periodo.mes, periodo.año);
          mesAñoDisplay = periodo.display;
        }

        if (atencionesDelMes.length === 0) {
          throw new Error(`No hay atenciones registradas en ${mesAñoDisplay}`);
        }

        const pdf = generarReportePDF(
          atencionesDelMes,
          mesAñoDisplay,
          'Tópico IESTPPA',
          opciones?.etiquetaFiltro
        );

        previewPDF(pdf);
        toast.success('Abriendo vista previa...');
      } catch (err) {
        handleError(err);
      } finally {
        setGenerando(false);
      }
    },
    []
  );

  // Funciones de compatibilidad anteriores
  const descargarReporteMesActual = useCallback(
    async (atenciones: AtencionConDetallesExtendida[]) => {
      return descargarReportePeriodo(atenciones);
    },
    [descargarReportePeriodo]
  );

  const descargarReporteMes = useCallback(
    async (atenciones: AtencionConDetallesExtendida[], mes: number, año: number) => {
      return descargarReportePeriodo(atenciones, { mes, año });
    },
    [descargarReportePeriodo]
  );

  const previsualizarMesActual = useCallback(
    async (atenciones: AtencionConDetallesExtendida[]) => {
      return previsualizarPeriodo(atenciones);
    },
    [previsualizarPeriodo]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generando,
    error,
    descargarReportePeriodo,
    previsualizarPeriodo,
    descargarReporteMesActual,
    descargarReporteMes,
    previsualizarMesActual,
    clearError,
  };
}
