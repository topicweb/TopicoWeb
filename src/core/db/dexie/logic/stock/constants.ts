// ───────────────────────────────────────────────────────────────────────────────
// STOCK LOGIC - CONSTANTS
// Constantes para validaciones y mensajes de error de stock
// ───────────────────────────────────────────────────────────────────────────────

import { TipoMedida } from '@/features/inventario/types';

/** Tipos de medida válidos según el esquema SQL */
export const TIPOS_MEDIDA_VALIDOS: TipoMedida[] = ['UNIDAD', 'VOLUMEN_ML', 'PESO_MG', 'PORCENTAJE'];
export const TIPOS_MOVIMIENTO_VALIDOS = ['ENTRADA', 'SALIDA'] as const;
export const MAX_CANTIDAD_STOCK = 2_147_483_647;

/** Mensajes de error específicos por tipo de medida */
export const ERROR_MESSAGES = {
  STOCK_INSUFICIENTE: (nombre: string, disponible: number, solicitado: number, unidad: string) =>
    `Stock insuficiente para "${nombre}". Disponible: ${disponible}${unidad}, Solicitado: ${solicitado}${unidad}`,
  TIPO_MEDIDA_INVALIDO: (recibido: string) =>
    `Tipo de medida inválido: "${recibido}". Valores permitidos: ${TIPOS_MEDIDA_VALIDOS.join(', ')}`,
  INCOMPATIBILIDAD_TIPO: (medTipo: string, movTipo: string) =>
    `Incompatibilidad de tipo: medicamento usa "${medTipo}" pero movimiento especifica "${movTipo}"`,
  MEDICAMENTO_NO_ENCONTRADO: (id: string) =>
    `Medicamento con ID "${id}" no encontrado`,
  CANTIDAD_INVALIDA: (cantidad: number) =>
    `Cantidad inválida: ${cantidad}. Debe ser un entero entre 1 y ${MAX_CANTIDAD_STOCK}`,
  TIPO_MOVIMIENTO_INVALIDO: (tipo: string) => `Tipo de movimiento inválido: "${tipo}"`,
  STOCK_EXCEDIDO: (stock: number, cantidad: number) =>
    `La entrada excede el stock máximo permitido (${stock} + ${cantidad})`,
  TENANT_INVALIDO: (medicamentoId: string) =>
    `El medicamento "${medicamentoId}" no pertenece al negocio actual`,
} as const;

/** Configuración de unidades por tipo de medida para mensajes de error */
export const UNIDADES_POR_TIPO: Record<TipoMedida, string> = {
  UNIDAD: ' unid.',
  VOLUMEN_ML: 'ml',
  PESO_MG: 'mg',
  PORCENTAJE: '%',
};
