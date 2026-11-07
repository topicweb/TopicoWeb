// ───────────────────────────────────────────────────────────────────────────────
// GENERADOR DE PDF: REPORTE MENSUAL DE ATENCIONES
// Crea un PDF con tabla de atenciones para un mes específico
// Diseño optimizado y perfectamente centrado en hoja A4 apaisada
// ───────────────────────────────────────────────────────────────────────────────

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AtencionConDetallesExtendida } from '../types';
import { calculateAge } from '@/features/pacientes/utils/calculateAge';
import { formatearFecha } from './reporteFilters';

/**
 * Configuración del PDF (ajustada para A4 horizontal centrada)
 */
const PDF_CONFIG = {
  paperFormat: 'a4' as const,
  orientation: 'landscape' as const,
  margins: { top: 14, bottom: 14 },
  tableWidth: 273, // 273mm de tabla + 12mm a cada lado = 297mm ancho A4
  fontSize: {
    title: 13,
    subtitle: 9,
    table: 7.5,
  },
  colors: {
    primary: [29, 93, 255] as [number, number, number],
    headerBg: [29, 93, 255] as [number, number, number],
    headerText: [255, 255, 255] as [number, number, number],
    borderColor: [200, 200, 200] as [number, number, number],
    altRowBg: [248, 249, 252] as [number, number, number],
  },
};

/**
 * Prepara datos de una atención para la tabla
 */
function prepararFilaAtencion(atencion: AtencionConDetallesExtendida): string[] {
  const fecha = new Date(atencion.fecha_atencion);
  const hora = fecha.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const edad = calculateAge(atencion.pacienteFechaNacimiento);
  const dispensaciones = atencion.dispensaciones
    ?.map((d) => `${d.medicamento_nombre}(${d.cantidad})`)
    .join(', ') || 'Sin medicamentos';

  const signos = atencion.signos_vitales
    ? [
        atencion.signos_vitales.temp ? `T:${atencion.signos_vitales.temp}°C` : null,
        atencion.signos_vitales.presion ? `PA:${atencion.signos_vitales.presion}` : null,
        atencion.signos_vitales.saturacion ? `O₂:${atencion.signos_vitales.saturacion}%` : null,
        atencion.signos_vitales.fr ? `FR:${atencion.signos_vitales.fr}` : null,
        atencion.signos_vitales.fc ? `FC:${atencion.signos_vitales.fc}` : null,
      ]
        .filter(Boolean)
        .join(' | ') || 'N/A'
    : 'N/A';

  return [
    `${formatearFecha(atencion.fecha_atencion)} ${hora}`,
    atencion.pacienteNombre || 'N/A',
    edad !== null ? `${edad} a.` : 'N/A',
    atencion.pacienteDNI || 'N/A',
    atencion.pacienteTelefono || 'N/A',
    (atencion.motivo_consulta || 'N/A').slice(0, 100),
    (atencion.diagnostico || 'N/A').slice(0, 100),
    signos,
    dispensaciones.slice(0, 160),
    atencion.staffNombre || 'N/A',
  ];
}

/**
 * Genera un PDF con reporte mensual de atenciones centrado en la hoja
 * @param atenciones - Array de atenciones para incluir
 * @param mesNombre - Nombre del mes (ej: "Octubre 2026")
 * @param institucion - Nombre de la institución (opcional)
 * @param subtituloFiltro - Etiqueta del filtro activo (opcional)
 */
export function generarReportePDF(
  atenciones: AtencionConDetallesExtendida[],
  mesNombre: string,
  institucion: string = 'Tópico IESTPPA',
  subtituloFiltro?: string
): jsPDF {
  // Crear documento PDF en formato A4 apaisado (297 x 210 mm)
  const doc = new jsPDF({
    orientation: PDF_CONFIG.orientation,
    unit: 'mm',
    format: PDF_CONFIG.paperFormat,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Margen horizontal simétrico para centrar perfectamente la tabla de 273mm
  const horizontalMargin = (pageWidth - PDF_CONFIG.tableWidth) / 2; // (297 - 273) / 2 = 12 mm
  let yPosition = PDF_CONFIG.margins.top;

  // ── ENCABEZADO ──────────────────────────────────────────────────────────────

  // Título principal centrado
  doc.setFontSize(PDF_CONFIG.fontSize.title);
  doc.setTextColor(...PDF_CONFIG.colors.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE ATENCIONES Y CONSULTAS', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6.5;

  // Subtítulo centrado con período y filtro si aplica
  doc.setFontSize(PDF_CONFIG.fontSize.subtitle);
  doc.setTextColor(90, 95, 110);
  doc.setFont('helvetica', 'normal');
  const filtroTexto = subtituloFiltro && subtituloFiltro !== 'Todos' ? ` • ${subtituloFiltro}` : '';
  doc.text(`${institucion} | ${mesNombre}${filtroTexto}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6.5;

  // Información metadata alineada con los bordes de la tabla centrada
  doc.setFontSize(7.5);
  doc.setTextColor(120, 125, 140);
  const fechaActual = new Date().toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(
    `Generado el: ${fechaActual} | Total de registros: ${atenciones.length}`,
    horizontalMargin,
    yPosition
  );

  if (subtituloFiltro && subtituloFiltro !== 'Todos') {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_CONFIG.colors.primary);
    doc.text(`Filtro: ${subtituloFiltro}`, pageWidth - horizontalMargin, yPosition, {
      align: 'right',
    });
    doc.setFont('helvetica', 'normal');
  }

  yPosition += 4.5;

  // ── TABLA DE ATENCIONES ──────────────────────────────────────────────────────────

  const filasTabla = atenciones.map((a) => prepararFilaAtencion(a));

  autoTable(doc, {
    head: [
      ['Fecha / Hora', 'Paciente', 'Edad', 'DNI', 'Teléfono', 'Motivo', 'Diagnóstico', 'Signos', 'Tratamiento', 'Responsable'],
    ],
    body: filasTabla,
    startY: yPosition,
    margin: {
      top: PDF_CONFIG.margins.top,
      right: horizontalMargin,
      bottom: PDF_CONFIG.margins.bottom,
      left: horizontalMargin,
    },
    tableWidth: PDF_CONFIG.tableWidth,
    headStyles: {
      fillColor: PDF_CONFIG.colors.headerBg,
      textColor: PDF_CONFIG.colors.headerText,
      fontStyle: 'bold',
      fontSize: PDF_CONFIG.fontSize.table,
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: PDF_CONFIG.fontSize.table,
      textColor: [40, 45, 55],
      overflow: 'linebreak',
      cellPadding: 1.8,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: PDF_CONFIG.colors.altRowBg,
    },
    // Suma de anchos: 22 + 30 + 12 + 18 + 20 + 35 + 35 + 33 + 42 + 26 = 273 mm
    columnStyles: {
      0: { halign: 'center', cellWidth: 22 },
      1: { halign: 'left', cellWidth: 30 },
      2: { halign: 'center', cellWidth: 12 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'left', cellWidth: 35 },
      6: { halign: 'left', cellWidth: 35 },
      7: { halign: 'left', cellWidth: 33 },
      8: { halign: 'left', cellWidth: 42 },
      9: { halign: 'left', cellWidth: 26 },
    },
    didDrawPage: () => {
      // Footer con número de página centrado
      const pageNum = doc.getNumberOfPages();
      const totalPages = (doc as any).lastAutoTable?.pageCount || pageNum;

      doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${pageNum} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    },
  });

  return doc;
}

/**
 * Descarga el PDF al dispositivo
 * @param doc - Documento jsPDF generado
 * @param nombreArchivo - Nombre del archivo sin extensión
 */
export function descargarPDF(doc: jsPDF, nombreArchivo: string = 'reporte-atenciones'): void {
  const timestamp = new Date().toISOString().split('T')[0];
  doc.save(`${nombreArchivo}-${timestamp}.pdf`);
}

/**
 * Abre el PDF en una nueva ventana/pestaña para previsualizar
 * @param doc - Documento jsPDF generado
 */
export function previewPDF(doc: jsPDF): void {
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}
