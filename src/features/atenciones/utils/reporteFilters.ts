// ───────────────────────────────────────────────────────────────────────────────
// UTILIDAD: FILTROS PARA REPORTES
// Filtración de atenciones por mes y rango de fechas con regla de gracia de 3 días
// ───────────────────────────────────────────────────────────────────────────────

import type { AtencionConDetallesExtendida } from '../types';
import type { FiltroGrupoAtencion } from '../types/filters';

/**
 * Obtiene el rango de fechas para un mes específico asegurando cubrir desde el 01
 * hasta el último milisegundo del último día del mes.
 * @param mes - Mes (1-12)
 * @param año - Año
 */
export function getRangoMesEspecifico(mes: number, año: number): { inicio: Date; fin: Date } {
  const inicio = new Date(año, mes - 1, 1, 0, 0, 0, 0);
  const fin = new Date(año, mes, 0, 23, 59, 59, 999);
  return { inicio, fin };
}

/**
 * Obtiene el primer y último día del mes actual
 */
export function getRangoMesActual(): { inicio: Date; fin: Date } {
  const ahora = new Date();
  return getRangoMesEspecifico(ahora.getMonth() + 1, ahora.getFullYear());
}

/**
 * Determina el mes y año objetivo para el botón de reporte considerando la regla de 3 días:
 * - Durante los primeros 3 días del mes (días 1, 2 y 3), se toma el mes anterior completo
 *   para permitir el cierre e impresión de reporte del mes previo sin problema.
 * - A partir del día 4 en adelante, se toma el mes en curso.
 * - Siempre comienza el día 01 del mes correspondiente.
 */
export function getPeriodoReporteConGracia(fechaReferencia: Date = new Date()): {
  mes: number; // 1-12
  año: number;
  inicio: Date;
  fin: Date;
  display: string;
  esMesAnterior: boolean;
} {
  const dia = fechaReferencia.getDate();
  let mes: number;
  let año: number;
  let esMesAnterior = false;

  if (dia <= 3) {
    // Primeros 3 días del mes: reportar el mes anterior
    esMesAnterior = true;
    const mesIndex = fechaReferencia.getMonth(); // 0 = Enero, ..., 11 = Diciembre
    if (mesIndex === 0) {
      // Enero -> mes anterior es Diciembre del año anterior
      mes = 12;
      año = fechaReferencia.getFullYear() - 1;
    } else {
      mes = mesIndex; // ej. Noviembre (index 10) -> Octubre (mes 10 en 1-12)
      año = fechaReferencia.getFullYear();
    }
  } else {
    // A partir del día 4: mes actual
    mes = fechaReferencia.getMonth() + 1;
    año = fechaReferencia.getFullYear();
  }

  const { inicio, fin } = getRangoMesEspecifico(mes, año);
  const display = `${getNombreMes(mes)} ${año}`;

  return { mes, año, inicio, fin, display, esMesAnterior };
}

/**
 * Verifica si una fecha está dentro de un rango
 */
export function estaEnRango(fecha: Date, inicio: Date, fin: Date): boolean {
  return fecha >= inicio && fecha <= fin;
}

/**
 * Filtra atenciones por mes actual estricto
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
 * Filtra atenciones por grupo o categoría (Alumno, Enfermería, Sistemas, Docente, etc.)
 */
export function filtrarAtencionesPorGrupo(
  atenciones: AtencionConDetallesExtendida[],
  grupo: FiltroGrupoAtencion
): AtencionConDetallesExtendida[] {
  if (!grupo || grupo === 'todos') {
    return atenciones;
  }

  return atenciones.filter((a) => {
    const cat = a.pacienteCategoria?.toLowerCase() || '';
    const esEstudiante = cat === 'estudiante' || cat === 'alumno';
    const prog = (a.programaNombre || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (grupo === 'alumno') {
      return esEstudiante;
    }
    if (grupo === 'enfermeria') {
      return esEstudiante && prog.includes('enfermer');
    }
    if (grupo === 'desarrollo_sistemas') {
      return esEstudiante && prog.includes('sistema');
    }
    if (grupo === 'docente') {
      return cat === 'docente';
    }
    if (grupo === 'administrativo') {
      return cat === 'administrativo' || cat === 'administrativos';
    }
    if (grupo === 'limpieza') {
      return cat === 'limpieza';
    }
    return true;
  });
}

/**
 * Retorna etiqueta amigable para un grupo de filtro
 */
export function getEtiquetaGrupo(grupo: FiltroGrupoAtencion): string {
  switch (grupo) {
    case 'alumno':
      return 'Alumnos';
    case 'enfermeria':
      return 'Alumnos - Enfermería Técnica';
    case 'desarrollo_sistemas':
      return 'Alumnos - Desarrollo de Sistemas';
    case 'docente':
      return 'Docentes';
    case 'administrativo':
      return 'Administrativos';
    case 'limpieza':
      return 'Personal de Limpieza';
    case 'todos':
    default:
      return 'Todos';
  }
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
