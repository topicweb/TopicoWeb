// ───────────────────────────────────────────────────────────────────────────────
// STOCK LOGIC - ERRORS
// Excepciones personalizadas para operaciones de stock
// ───────────────────────────────────────────────────────────────────────────────

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
