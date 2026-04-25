// ───────────────────────────────────────────────────────────────────────────────
// STOCK LOGIC - VALIDATION
// Funciones de validación para operaciones de stock
// ───────────────────────────────────────────────────────────────────────────────

import { TipoMedida, TipoMovimiento, Medicamento } from '@/features/inventario/types';
import { TIPOS_MEDIDA_VALIDOS, ERROR_MESSAGES, UNIDADES_POR_TIPO } from './constants';
import { StockError } from './errors';

/**
 * Valida que el tipo de medida sea uno de los valores permitidos.
 * @throws {StockError} Si el tipo es inválido
 */
export function validarTipoMedida(tipo: unknown): asserts tipo is TipoMedida {
  if (!TIPOS_MEDIDA_VALIDOS.includes(tipo as TipoMedida)) {
    throw new StockError(
      ERROR_MESSAGES.TIPO_MEDIDA_INVALIDO(String(tipo)),
      'TIPO_MEDIDA_INVALIDO',
      undefined,
      { tipoRecibido: tipo, tiposValidos: TIPOS_MEDIDA_VALIDOS }
    );
  }
}

/**
 * Valida que la cantidad sea positiva y válida.
 * @throws {StockError} Si la cantidad es inválida
 */
export function validarCantidad(cantidad: number): void {
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw new StockError(
      ERROR_MESSAGES.CANTIDAD_INVALIDA(cantidad),
      'CANTIDAD_INVALIDA',
      undefined,
      { cantidad }
    );
  }
}

/**
 * Valida compatibilidad entre tipo_medida del medicamento y el movimiento.
 * Permite movimientos sin tipo_medida especificado (hereda del medicamento).
 * @throws {StockError} Si hay incompatibilidad de tipos
 */
export function validarCompatibilidadTipoMedida(
  medicamento: Medicamento,
  movimientoTipoMedida?: TipoMedida
): void {
  // Si el movimiento no especifica tipo, hereda del medicamento (siempre válido)
  if (!movimientoTipoMedida) return;

  // Validación cruzada: el tipo del movimiento debe coincidir con el del medicamento
  if (medicamento.tipo_medida !== movimientoTipoMedida) {
    throw new StockError(
      ERROR_MESSAGES.INCOMPATIBILIDAD_TIPO(medicamento.tipo_medida, movimientoTipoMedida),
      'INCOMPATIBILIDAD_TIPO',
      medicamento.id,
      {
        medicamentoTipo: medicamento.tipo_medida,
        movimientoTipo: movimientoTipoMedida,
        medicamentoNombre: medicamento.nombre
      }
    );
  }
}

/**
 * Valida que haya stock suficiente para una salida.
 * @throws {StockError} Si no hay stock suficiente
 */
export function validarStockSuficiente(
  medicamento: Medicamento,
  cantidadSolicitada: number,
  tipoMovimiento: TipoMovimiento
): void {
  // Solo validar para salidas
  if (tipoMovimiento === 'ENTRADA') return;

  const stockDisponible = medicamento.stock_actual ?? 0;

  if (cantidadSolicitada > stockDisponible) {
    const unidad = UNIDADES_POR_TIPO[medicamento.tipo_medida];
    throw new StockError(
      ERROR_MESSAGES.STOCK_INSUFICIENTE(
        medicamento.nombre,
        stockDisponible,
        cantidadSolicitada,
        unidad
      ),
      'STOCK_INSUFICIENTE',
      medicamento.id,
      {
        stockDisponible,
        cantidadSolicitada,
        tipoMedida: medicamento.tipo_medida,
        unidad
      }
    );
  }
}

/**
 * Valida límites de dispensación según el tipo de medicamento.
 * Permite configurar límites máximos por tipo de medida.
 *
 * @throws {StockError} Si se excede el límite permitido
 */
export function validarLimiteDispensacion(
  medicamento: { nombre: string; tipo_medida: TipoMedida },
  cantidadSolicitada: number,
  limites?: Partial<Record<TipoMedida, number>>
): void {
  const limitesDefault: Record<TipoMedida, number> = {
    UNIDAD: 50,      // Máximo 50 unidades (pastillas)
    VOLUMEN_ML: 500, // Máximo 500ml (líquidos)
    PESO_MG: 1000,   // Máximo 1000mg (polvos/cremas)
    PORCENTAJE: 100, // Máximo 100% (soluciones concentradas)
  };

  const limitesEfectivos = { ...limitesDefault, ...limites };
  const limite = limitesEfectivos[medicamento.tipo_medida];

  if (cantidadSolicitada > limite) {
    const unidad = UNIDADES_POR_TIPO[medicamento.tipo_medida];
    throw new StockError(
      `Límite de dispensación excedido para "${medicamento.nombre}". ` +
      `Máximo permitido: ${limite}${unidad}, Solicitado: ${cantidadSolicitada}${unidad}`,
      'STOCK_INSUFICIENTE',
      undefined,
      {
        limiteMaximo: limite,
        cantidadSolicitada,
        tipoMedida: medicamento.tipo_medida,
        unidad
      }
    );
  }
}
