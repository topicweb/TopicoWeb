// ───────────────────────────────────────────────────────────────────────────────
// STOCK LOGIC - OPERATIONS
// Operaciones de base de datos para gestión de stock
// ───────────────────────────────────────────────────────────────────────────────

import { db } from '../../db';
import { TipoMovimiento, TipoMedida, Medicamento } from '@/features/inventario/types';
import { ERROR_MESSAGES, UNIDADES_POR_TIPO } from './constants';
import { StockError } from './errors';
import { validarCantidad, validarTipoMedida, validarCompatibilidadTipoMedida, validarStockSuficiente } from './validation';

/**
 * Actualiza el `stock_actual` de un medicamento basado en un movimiento de inventario.
 * IMPORTANTE: Esta función debe ejecutarse SIEMPRE dentro de una transacción Dexie
 * para garantizar consistencia de datos.
 *
 * @param medicamentoId       ID del medicamento a actualizar
 * @param cantidad            Cantidad a sumar (ENTRADA) o restar (SALIDA)
 * @param tipo                'ENTRADA' o 'SALIDA' (según el esquema SQL)
 * @param timestamp           ISO string del momento del movimiento
 * @param tipoMedida          Tipo de medida del movimiento (opcional, hereda del medicamento)
 * @param descripcion         Descripción generada para movimientos consolidados
 *
 * @throws {StockError} Si hay error de validación de stock o tipo de medida
 */
export async function updateMedicamentoStock(
  medicamentoId: string,
  cantidad: number,
  tipo: TipoMovimiento,
  timestamp: string,
  tipoMedida?: TipoMedida,
  descripcion?: string
): Promise<void> {
  // Validar cantidad
  validarCantidad(cantidad);

  // Obtener medicamento
  const medicamento = await db.medicamentos.get(medicamentoId);
  if (!medicamento) {
    throw new StockError(
      ERROR_MESSAGES.MEDICAMENTO_NO_ENCONTRADO(medicamentoId),
      'MEDICAMENTO_NO_ENCONTRADO',
      medicamentoId
    );
  }

  // Validar tipo_medida del movimiento si se proporciona
  if (tipoMedida) {
    validarTipoMedida(tipoMedida);
  }

  // Validar compatibilidad entre tipos (validación cruzada)
  validarCompatibilidadTipoMedida(medicamento, tipoMedida);

  // Validar stock suficiente para salidas
  validarStockSuficiente(medicamento, cantidad, tipo);

  // Calcular nuevo stock
  const stockActual = medicamento.stock_actual ?? 0;
  const nuevoStock = tipo === 'ENTRADA'
    ? stockActual + cantidad
    : Math.max(0, stockActual - cantidad);

  // Actualizar medicamento
  await db.medicamentos.update(medicamentoId, {
    stock_actual: nuevoStock,
    actualizado_at: timestamp,
    sync_status: 'pending',
  });
}

/**
 * Verifica el stock disponible para un medicamento considerando su tipo de medida.
 * Útil para UI que muestra disponibilidad antes de dispensar.
 */
export async function verificarStockDisponible(
  medicamentoId: string,
  cantidadRequerida: number,
  tipoMedida?: TipoMedida
): Promise<{
  disponible: boolean;
  stockActual: number;
  tipoMedida: TipoMedida;
  unidad: string;
  mensaje?: string;
}> {
  const medicamento = await db.medicamentos.get(medicamentoId);

  if (!medicamento) {
    return {
      disponible: false,
      stockActual: 0,
      tipoMedida: tipoMedida || 'UNIDAD',
      unidad: UNIDADES_POR_TIPO[tipoMedida || 'UNIDAD'],
      mensaje: ERROR_MESSAGES.MEDICAMENTO_NO_ENCONTRADO(medicamentoId)
    };
  }

  const stockActual = medicamento.stock_actual ?? 0;
  const medidaEfectiva = tipoMedida || medicamento.tipo_medida;
  const unidad = UNIDADES_POR_TIPO[medidaEfectiva];

  // Validar compatibilidad si se especificó tipo_medida
  if (tipoMedida && medicamento.tipo_medida !== tipoMedida) {
    return {
      disponible: false,
      stockActual,
      tipoMedida: medidaEfectiva,
      unidad,
      mensaje: ERROR_MESSAGES.INCOMPATIBILIDAD_TIPO(medicamento.tipo_medida, tipoMedida)
    };
  }

  const disponible = cantidadRequerida <= stockActual;

  return {
    disponible,
    stockActual,
    tipoMedida: medidaEfectiva,
    unidad,
    mensaje: disponible ? undefined : ERROR_MESSAGES.STOCK_INSUFICIENTE(
      medicamento.nombre,
      stockActual,
      cantidadRequerida,
      unidad
    )
  };
}
