// ───────────────────────────────────────────────────────────────────────────────
// GENERADOR DE PDF: REPORTE MENSUAL DE ATENCIONES
// Crea un PDF con tabla de atenciones para un mes específico
// Optimizado para móviles y PWA
// ───────────────────────────────────────────────────────────────────────────────

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AtencionConDetallesExtendida } from '../types';
import { formatearFecha, getNombreMes } from './reporteFilters';

/**
 * Configuración del PDF (ajustada para móviles y escritorio)
 */
const PDF_CONFIG = {
  paperFormat: 'a4' as const,
  orientation: 'landscape' as const,
  margins: { top: 15, right: 10, bottom: 15, left: 10 },
  fontSize: {
    title: 14,
    subtitle: 9,
    table: 8,
  },
  colors: {
    primary: [29, 93, 255], // #1D5DFF - Color primario
    headerBg: [29, 93, 255],
    headerText: [255, 255, 255],
    borderColor: [200, 200, 200],
    altRowBg: [245, 245, 245],
  },
};

/**
 * Prepara datos de una atención para la tabla
 */
function prepararFilaAtencion(atencion: AtencionConDetallesExtendida): Record<string, string> {
  const dispensaciones = atencion.dispensaciones
    ?.map((d) => `${d.medicamento_nombre}(${d.cantidad})`)
    .join(', ') || 'Sin medicamentos';

  return {
    fecha: formatearFecha(atencion.fecha_atencion),
    paciente: atencion.pacienteNombre || 'N/A',
    dni: atencion.pacienteDNI || 'N/A',
    staff: atencion.staffNombre || 'N/A',
    motivo: atencion.motivo_consulta || 'N/A',
    medicamentos: dispensaciones,
  };
}

/**
 * Formatea los signos vitales para mostrar
 */
function formatearSignosVitales(atencion: AtencionConDetallesExtendida): string {
  const sv = atencion.signos_vitales;
  if (!sv) return 'N/A';
  return `T: ${sv.temp}°C | PA: ${sv.presion} | O₂: ${sv.saturacion}%`;
}

/**
 * Genera un PDF con reporte mensual de atenciones
 * @param atenciones - Array de atenciones para incluir
 * @param mesNombre - Nombre del mes (ej: "Agosto 2026")
 * @param institucion - Nombre de la institución (opcional)
 */
export function generarReportePDF(
  atenciones: AtencionConDetallesExtendida[],
  mesNombre: string,
  institucion: string = 'Clínica Tópico'
): jsPDF {
  // Crear documento PDF
  const doc = new jsPDF({
    orientation: PDF_CONFIG.orientation,
    unit: 'mm',
    format: PDF_CONFIG.paperFormat,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { top, right, left } = PDF_CONFIG.margins;

  let yPosition = top;

  // ── ENCABEZADO ──────────────────────────────────────────────────────────────

  // Título
  doc.setFontSize(PDF_CONFIG.fontSize.title);
  doc.setTextColor(...PDF_CONFIG.colors.primary);
  doc.setFont(undefined, 'bold');
  doc.text('REPORTE MENSUAL DE ATENCIONES', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Subtítulo
  doc.setFontSize(PDF_CONFIG.fontSize.subtitle);
  doc.setTextColor(100, 100, 100);
  doc.setFont(undefined, 'normal');
  doc.text(`${institucion} | ${mesNombre}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Información del reporte
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  const fechaActual = new Date().toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`Generado el: ${fechaActual} | Total de atenciones: ${atenciones.length}`, left, yPosition);
  yPosition += 5;

  // ── TABLA DE ATENCIONES ──────────────────────────────────────────────────────────

  const filasTabla = atenciones.map((a) => [
    formatearFecha(a.fecha_atencion),
    a.pacienteNombre || 'N/A',
    a.pacienteDNI || 'N/A',
    a.staffNombre || 'N/A',
    a.motivo_consulta || 'N/A',
    formatearSignosVitales(a),
    a.dispensaciones?.map((d) => `${d.medicamento_nombre}(${d.cantidad})`).join(', ') || 'Sin',
  ]);

  autoTable(doc, {
    head: [
      ['Fecha', 'Paciente', 'DNI', 'Personal', 'Motivo', 'Signos Vitales', 'Medicamentos'],
    ],
    body: filasTabla,
    startY: yPosition,
    margin: { top: PDF_CONFIG.margins.top, right: PDF_CONFIG.margins.right, bottom: PDF_CONFIG.margins.bottom, left: PDF_CONFIG.margins.left },
    headStyles: {
      fillColor: PDF_CONFIG.colors.headerBg,
      textColor: PDF_CONFIG.colors.headerText,
      fontStyle: 'bold',
      fontSize: PDF_CONFIG.fontSize.table,
      padding: 3,
      halign: 'center' as const,
      valign: 'middle' as const,
    },
    bodyStyles: {
      fontSize: PDF_CONFIG.fontSize.table,
      padding: 2.5,
      textColor: [40, 40, 40],
    },
    alternateRowStyles: {
      fillColor: PDF_CONFIG.colors.altRowBg,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 }, // Fecha
      1: { halign: 'left', cellWidth: 35 }, // Paciente
      2: { halign: 'center', cellWidth: 22 }, // DNI
      3: { halign: 'left', cellWidth: 28 }, // Personal
      4: { halign: 'left', cellWidth: 35 }, // Motivo
      5: { halign: 'left', cellWidth: 40 }, // Signos Vitales
      6: { halign: 'left' }, // Medicamentos (flexible)
    },
    didDrawPage: (data) => {
      // Footer con número de página
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.getHeight();
      const pageWidth = pageSize.getWidth();
      const pageNum = doc.getNumberOfPages();
      const totalPages = (doc as any).lastAutoTable?.pageCount || pageNum;

      doc.setFontSize(7);
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
  const pdfUrl = doc.output('bloburi');
  window.open(pdfUrl as string, '_blank');
}
