// ───────────────────────────────────────────────────────────────────────────────
// STOCK LOGIC - GROUPING
// Sistema de agrupación inteligente para dispensaciones
// ───────────────────────────────────────────────────────────────────────────────

import { TipoMedida } from '@/features/inventario/types';
import { TIPOS_MEDIDA_VALIDOS, UNIDADES_POR_TIPO } from './constants';

/**
 * Representa un grupo de dispensaciones consolidadas.
 * Permite sumar cantidades del mismo medicamento y generar descripciones unificadas.
 */
export interface GrupoDispensacion {
  medicamento_id: string;
  medicamento_nombre: string;
  tipo_medida: TipoMedida;
  cantidad_total: number;
  presentacion?: string;
  items_originales: number; // Cuántas dispensaciones individuales se agruparon
}

/**
 * Agrupa dispensaciones por medicamento, sumando cantidades del mismo tipo.
 *
 * Ejemplo:
 * Input:  [
 *   { medicamento_id: 'A', cantidad: 2, tipo_medida: 'UNIDAD', medicamento: { nombre: 'Paracetamol' } },
 *   { medicamento_id: 'A', cantidad: 1, tipo_medida: 'UNIDAD', medicamento: { nombre: 'Paracetamol' } },
 *   { medicamento_id: 'B', cantidad: 5, tipo_medida: 'VOLUMEN_ML', medicamento: { nombre: 'Alcohol' } }
 * ]
 * Output: [
 *   { medicamento_id: 'A', medicamento_nombre: 'Paracetamol', tipo_medida: 'UNIDAD', cantidad_total: 3, items_originales: 2 },
 *   { medicamento_id: 'B', medicamento_nombre: 'Alcohol', tipo_medida: 'VOLUMEN_ML', cantidad_total: 5, items_originales: 1 }
 * ]
 */
export function agruparDispensacionesPorMedicamento<
  T extends { medicamento_id: string; cantidad: number; tipo_medida: TipoMedida; medicamento: { nombre: string; tipo_medida: TipoMedida; presentacion?: string } }
>(dispensaciones: T[]): GrupoDispensacion[] {
  if (dispensaciones.length === 0) return [];

  const grupos = new Map<string, GrupoDispensacion>();

  for (const disp of dispensaciones) {
    const id = disp.medicamento_id;

    if (grupos.has(id)) {
      // Sumar a grupo existente
      const grupo = grupos.get(id)!;
      grupo.cantidad_total += disp.cantidad;
      grupo.items_originales += 1;
    } else {
      // Crear nuevo grupo
      grupos.set(id, {
        medicamento_id: id,
        medicamento_nombre: disp.medicamento.nombre,
        tipo_medida: disp.tipo_medida,
        cantidad_total: disp.cantidad,
        presentacion: disp.medicamento.presentacion,
        items_originales: 1,
      });
    }
  }

  return Array.from(grupos.values());
}

/**
 * Agrupa dispensaciones por tipo de medida.
 * Útil para generar reportes separados: pastillas, líquidos, peso, porcentaje.
 */
export function agruparDispensacionesPorTipoMedida<
  T extends { tipo_medida: TipoMedida; medicamento: { nombre: string }; cantidad: number }
>(dispensaciones: T[]): Record<TipoMedida, Array<{ medicamento_nombre: string; cantidad: number; tipo_medida: TipoMedida }>> {
  const resultado: Record<TipoMedida, Array<{ medicamento_nombre: string; cantidad: number; tipo_medida: TipoMedida }>> = {
    UNIDAD: [],
    VOLUMEN_ML: [],
    PESO_MG: [],
    PORCENTAJE: [],
  };

  for (const disp of dispensaciones) {
    resultado[disp.tipo_medida].push({
      medicamento_nombre: disp.medicamento.nombre,
      cantidad: disp.cantidad,
      tipo_medida: disp.tipo_medida,
    });
  }

  return resultado;
}

/**
 * Genera un resumen de dispensación por tipo de medida.
 * Ejemplo: "Pastillas: 3 unid. | Líquidos: 15ml"
 */
export function generarResumenPorTipoMedida(
  dispensaciones: Array<{
    medicamento: { nombre: string; tipo_medida: TipoMedida };
    cantidad: number;
  }>
): string {
  if (dispensaciones.length === 0) return '';

  // Agrupar manualmente por tipo de medida
  const porTipo: Record<TipoMedida, Array<{ nombre: string; cantidad: number }>> = {
    UNIDAD: [],
    VOLUMEN_ML: [],
    PESO_MG: [],
    PORCENTAJE: [],
  };

  for (const disp of dispensaciones) {
    const tipo = disp.medicamento.tipo_medida;
    porTipo[tipo].push({
      nombre: disp.medicamento.nombre,
      cantidad: disp.cantidad,
    });
  }

  const resumenes: string[] = [];

  for (const tipo of TIPOS_MEDIDA_VALIDOS) {
    const items = porTipo[tipo];
    if (items.length === 0) continue;

    const cantidadTotal = items.reduce((sum, item) => sum + item.cantidad, 0);
    const unidad = UNIDADES_POR_TIPO[tipo];
    const nombres = items.map(i => i.nombre).join(', ');

    resumenes.push(`${cantidadTotal}${unidad} (${nombres})`);
  }

  return resumenes.join(' | ');
}

/**
 * Genera una descripción consolidada para movimientos de atención.
 * Ejemplo: "Atención: 2 Unid. Paracetamol, 5ml Alcohol"
 *
 * Esta función agrupa automáticamente medicamentos duplicados.
 */
export function generarDescripcionMovimiento(
  dispensaciones: Array<{
    medicamento: { nombre: string; tipo_medida: TipoMedida };
    cantidad: number;
  }>
): string {
  if (dispensaciones.length === 0) return '';

  // Agrupar por nombre de medicamento para consolidar duplicados
  const grupos = new Map<string, { cantidad: number; tipo_medida: TipoMedida }>();

  for (const disp of dispensaciones) {
    const nombre = disp.medicamento.nombre;
    if (grupos.has(nombre)) {
      const grupo = grupos.get(nombre)!;
      grupo.cantidad += disp.cantidad;
    } else {
      grupos.set(nombre, {
        cantidad: disp.cantidad,
        tipo_medida: disp.medicamento.tipo_medida,
      });
    }
  }

  const items: string[] = [];
  for (const [nombre, datos] of grupos) {
    const unidad = UNIDADES_POR_TIPO[datos.tipo_medida];
    items.push(`${datos.cantidad}${unidad} ${nombre}`);
  }

  return `Atención: ${items.join(', ')}`;
}
