import { db } from '../db';
import { TipoMovimiento, TipoMedida, Medicamento } from '@/features/inventario/types';

// ── Constantes ─────────────────────────────────────────────────────────────

/** Tipos de medida válidos según el esquema SQL */
const TIPOS_MEDIDA_VALIDOS: TipoMedida[] = ['UNIDAD', 'VOLUMEN_ML', 'PESO_MG', 'PORCENTAJE'];

/** Mensajes de error específicos por tipo de medida */
const ERROR_MESSAGES = {
  STOCK_INSUFICIENTE: (nombre: string, disponible: number, solicitado: number, unidad: string) =>
    `Stock insuficiente para "${nombre}". Disponible: ${disponible}${unidad}, Solicitado: ${solicitado}${unidad}`,
  TIPO_MEDIDA_INVALIDO: (recibido: string) =>
    `Tipo de medida inválido: "${recibido}". Valores permitidos: ${TIPOS_MEDIDA_VALIDOS.join(', ')}`,
  INCOMPATIBILIDAD_TIPO: (medTipo: string, movTipo: string) =>
    `Incompatibilidad de tipo: medicamento usa "${medTipo}" pero movimiento especifica "${movTipo}"`,
  MEDICAMENTO_NO_ENCONTRADO: (id: string) =>
    `Medicamento con ID "${id}" no encontrado`,
  CANTIDAD_INVALIDA: (cantidad: number) =>
    `Cantidad inválida: ${cantidad}. Debe ser mayor a 0`,
} as const;

/** Configuración de unidades por tipo de medida para mensajes de error */
const UNIDADES_POR_TIPO: Record<TipoMedida, string> = {
  UNIDAD: ' unid.',
  VOLUMEN_ML: 'ml',
  PESO_MG: 'mg',
  PORCENTAJE: '%',
};

// ── Excepciones Personalizadas ─────────────────────────────────────────────

/** Error específico para operaciones de stock */
export class StockError extends Error {
  constructor(
    message: string,
    public readonly code: 'STOCK_INSUFICIENTE' | 'TIPO_MEDIDA_INVALIDO' | 'INCOMPATIBILIDAD_TIPO' | 'MEDICAMENTO_NO_ENCONTRADO' | 'CANTIDAD_INVALIDA',
    public readonly medicamentoId?: string,
    public readonly detalles?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'StockError';
  }
}

// ── Funciones de Validación ────────────────────────────────────────────────

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

// ── Funciones Principales ───────────────────────────────────────────────────

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

/**
 * Genera una descripción consolidada para movimientos de atención.
 * Ejemplo: "Atención: 2 Unid. Paracetamol, 5ml Alcohol"
 */
export function generarDescripcionMovimiento(
  dispensaciones: Array<{
    medicamento: { nombre: string; tipo_medida: TipoMedida };
    cantidad: number;
  }>
): string {
  if (dispensaciones.length === 0) return '';

  const items = dispensaciones.map(d => {
    const unidad = UNIDADES_POR_TIPO[d.medicamento.tipo_medida];
    return `${d.cantidad}${unidad} ${d.medicamento.nombre}`;
  });

  return `Atención: ${items.join(', ')}`;
}
