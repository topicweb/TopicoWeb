// ───────────────────────────────────────────────────────────────────────────────
// GENERADOR DE PDF: REPORTE MENSUAL DE ATENCIONES
// Crea un PDF con tabla de atenciones para un mes específico
// Optimizado para móviles y PWA
// ───────────────────────────────────────────────────────────────────────────────

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AtencionConDetallesExtendida } from '../types';
import { calculateAge } from '@/features/pacientes/utils/calculateAge';
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
    primary: [29, 93, 255] as [number, number, number],
    headerBg: [29, 93, 255] as [number, number, number],
    headerText: [255, 255, 255] as [number, number, number],
    borderColor: [200, 200, 200] as [number, number, number],
    altRowBg: [245, 245, 245] as [number, number, number],
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
    (atencion.motivo_consulta || 'N/A').slice(0, 120),
    signos,
    dispensaciones.slice(0, 140),
    atencion.staffNombre || 'N/A',
  ];
}

/**
 * Formatea los signos vitales para mostrar
 */
function formatearSignosVitales(atencion: AtencionConDetallesExtendida): string {
  const sv = atencion.signos_vitales;
  if (!sv) return 'N/A';
  return [
    sv.temp ? `T: ${sv.temp}°C` : null,
    sv.presion ? `PA: ${sv.presion}` : null,
    sv.saturacion ? `O₂: ${sv.saturacion}%` : null,
  ].filter(Boolean).join(' | ') || 'N/A';
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
  institucion: string = 'Tópico IESTPPA'
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
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE MENSUAL DE ATENCIONES', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Subtítulo
  doc.setFontSize(PDF_CONFIG.fontSize.subtitle);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
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

  const filasTabla = atenciones.map((a) => prepararFilaAtencion(a));

  autoTable(doc, {
    head: [
      ['Fecha/Hora', 'Paciente', 'Edad', 'DNI', 'Teléfono', 'Diagnóstico', 'Signos', 'Tratamiento', 'Responsable'],
    ],
    body: filasTabla,
    startY: yPosition,
    margin: { top: PDF_CONFIG.margins.top, right: PDF_CONFIG.margins.right, bottom: PDF_CONFIG.margins.bottom, left: PDF_CONFIG.margins.left },
    headStyles: {
      fillColor: PDF_CONFIG.colors.headerBg as [number, number, number],
      textColor: PDF_CONFIG.colors.headerText as [number, number, number],
      fontStyle: 'bold',
      fontSize: PDF_CONFIG.fontSize.table,
      halign: 'center' as const,
      valign: 'middle' as const,
    },
    bodyStyles: {
      fontSize: PDF_CONFIG.fontSize.table,
      textColor: [40, 40, 40] as [number, number, number],
      overflow: 'linebreak' as const,
      cellPadding: 1.6,
    },
    alternateRowStyles: {
      fillColor: PDF_CONFIG.colors.altRowBg,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      1: { halign: 'left', cellWidth: 28 },
      2: { halign: 'center', cellWidth: 12 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 24 },
      5: { halign: 'left', cellWidth: 34 },
      6: { halign: 'left', cellWidth: 28 },
      7: { halign: 'left', cellWidth: 34 },
      8: { halign: 'left', cellWidth: 28 },
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
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}
