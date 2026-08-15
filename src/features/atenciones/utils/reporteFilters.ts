// ───────────────────────────────────────────────────────────────────────────────
// UTILIDAD: FILTROS PARA REPORTES
// Filtración de atenciones por mes y rango de fechas
// ───────────────────────────────────────────────────────────────────────────────

import type { AtencionConDetallesExtendida } from '../types';

/**
 * Obtiene el primer y último día del mes actual
 */
export function getRangoMesActual(): { inicio: Date; fin: Date } {
  const ahora = new Date();
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  return { inicio, fin };
}

/**
 * Obtiene el rango de fechas para un mes específico
 * @param mes - Mes (1-12)
 * @param año - Año
 */
export function getRangoMesEspecifico(mes: number, año: number): { inicio: Date; fin: Date } {
  const inicio = new Date(año, mes - 1, 1);
  const fin = new Date(año, mes, 0);
  return { inicio, fin };
}

/**
 * Verifica si una fecha está dentro de un rango
 */
function estaEnRango(fecha: Date, inicio: Date, fin: Date): boolean {
  return fecha >= inicio && fecha <= fin;
}

/**
 * Filtra atenciones por mes actual
 */
export function filtrarAtencionesPorMesActual(
  atenciones: AtencionConDetallesExtendida[]
): AtencionConDetallesExtendida[] {
  const { inicio, fin } = getRangoMesActual();
  return atenciones.filter((a) => {
    const fecha = new Date(a.fecha_atencion);
    return estaEnRango(fecha, inicio, fin);
  });
}

/**
 * Filtra atenciones por mes específico
 */
export function filtrarAtencionesPorMes(
  atenciones: AtencionConDetallesExtendida[],
  mes: number,
  año: number
): AtencionConDetallesExtendida[] {
  const { inicio, fin } = getRangoMesEspecifico(mes, año);
  return atenciones.filter((a) => {
    const fecha = new Date(a.fecha_atencion);
    return estaEnRango(fecha, inicio, fin);
  });
}

/**
 * Obtiene el nombre del mes en español
 */
export function getNombreMes(mes: number): string {
  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  return meses[Math.max(0, Math.min(11, mes - 1))];
}

/**
 * Formatea una fecha a formato DD/MM/YYYY
 */
export function formatearFecha(fecha: string | Date): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Obtiene mes y año actual en formato para mostrar
 */
export function getMesAñoActual(): { mes: number; año: number; display: string } {
  const ahora = new Date();
  const mes = ahora.getMonth() + 1;
  const año = ahora.getFullYear();
  const display = `${getNombreMes(mes)} ${año}`;
  return { mes, año, display };
}
