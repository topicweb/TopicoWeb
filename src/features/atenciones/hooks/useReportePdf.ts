// ───────────────────────────────────────────────────────────────────────────────
// HOOK: useReportePdf
// Maneja la generación y descarga de reportes PDF de atenciones
// ───────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { AtencionConDetallesExtendida } from '../types';
import {
  filtrarAtencionesPorMesActual,
  filtrarAtencionesPorMes,
  getMesAñoActual,
  getNombreMes,
} from '../utils/reporteFilters';
import { generarReportePDF, descargarPDF, previewPDF } from '../utils/reportePdfGenerator';

export interface UseReportePdfReturn {
  generando: boolean;
  error: string | null;
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

  const descargarReporteMesActual = useCallback(
    async (atenciones: AtencionConDetallesExtendida[]) => {
      setGenerando(true);
      setError(null);

      try {
        // Validaciones
        if (!atenciones || atenciones.length === 0) {
          throw new Error('No hay atenciones para generar el reporte');
        }

        // Filtrar atenciones del mes actual
        const atencionesDelMes = filtrarAtencionesPorMesActual(atenciones);

        if (atencionesDelMes.length === 0) {
          throw new Error('No hay atenciones registradas en el mes actual');
        }

        // Obtener nombre del mes
        const { display: mesAñoDisplay } = getMesAñoActual();

        // Generar PDF
        const pdf = generarReportePDF(atencionesDelMes, mesAñoDisplay);

        // Descargar
        descargarPDF(pdf, `reporte-atenciones-${mesAñoDisplay.toLowerCase().replace(' ', '-')}`);

        toast.success(`Reporte descargado: ${atencionesDelMes.length} atenciones`);
      } catch (err) {
        handleError(err);
      } finally {
        setGenerando(false);
      }
    },
    []
  );

  const descargarReporteMes = useCallback(
    async (atenciones: AtencionConDetallesExtendida[], mes: number, año: number) => {
      setGenerando(true);
      setError(null);

      try {
        // Validaciones
        if (!atenciones || atenciones.length === 0) {
          throw new Error('No hay atenciones para generar el reporte');
        }

        if (mes < 1 || mes > 12) {
          throw new Error('Mes inválido (debe ser 1-12)');
        }

        if (año < 2000 || año > new Date().getFullYear() + 1) {
          throw new Error('Año inválido');
        }

        // Filtrar atenciones del mes especificado
        const atencionesDelMes = filtrarAtencionesPorMes(atenciones, mes, año);

        if (atencionesDelMes.length === 0) {
          throw new Error(`No hay atenciones registradas en ${getNombreMes(mes)} ${año}`);
        }

        // Obtener nombre del mes
        const mesAñoDisplay = `${getNombreMes(mes)} ${año}`;

        // Generar PDF
        const pdf = generarReportePDF(atencionesDelMes, mesAñoDisplay);

        // Descargar
        descargarPDF(pdf, `reporte-atenciones-${mes}-${año}`);

        toast.success(`Reporte descargado: ${atencionesDelMes.length} atenciones`);
      } catch (err) {
        handleError(err);
      } finally {
        setGenerando(false);
      }
    },
    []
  );

  const previsualizarMesActual = useCallback(
    async (atenciones: AtencionConDetallesExtendida[]) => {
      setGenerando(true);
      setError(null);

      try {
        // Validaciones
        if (!atenciones || atenciones.length === 0) {
          throw new Error('No hay atenciones para generar el reporte');
        }

        // Filtrar atenciones del mes actual
        const atencionesDelMes = filtrarAtencionesPorMesActual(atenciones);

        if (atencionesDelMes.length === 0) {
          throw new Error('No hay atenciones registradas en el mes actual');
        }

        // Obtener nombre del mes
        const { display: mesAñoDisplay } = getMesAñoActual();

        // Generar PDF
        const pdf = generarReportePDF(atencionesDelMes, mesAñoDisplay);

        // Previsualizar
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

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generando,
    error,
    descargarReporteMesActual,
    descargarReporteMes,
    previsualizarMesActual,
    clearError,
  };
}
