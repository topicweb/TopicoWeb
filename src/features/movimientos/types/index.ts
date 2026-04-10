import { MovimientoStock, TipoMovimiento } from "@/features/inventario/types";

// ── Domain Types ───────────────────────────────────────────────────────────

/**
 * Movimiento con información enriquecida del medicamento
 * Resultado típico de un JOIN con la tabla de medicamentos
 */
export interface MovimientoConMedicamento extends MovimientoStock {
  medicamentoNombre: string;
}

/**
 * Input para crear un nuevo movimiento de stock
 * Omite campos generados automáticamente por el sistema
 */
export type CrearMovimientoInput = Omit<
  MovimientoStock,
  "id" | "business_id" | "creado_at" | "actualizado_at" | "sync_status"
>;

/**
 * Resultado de la operación de registro de movimiento
 */
export interface RegistroMovimientoResult {
  movimientoId: string;
  medicamentoId: string;
  stockAnterior: number;
  stockNuevo: number;
  tipo: TipoMovimiento;
}

/**
 * Filtros para consultas de movimientos
 */
export interface FiltrosMovimiento {
  medicamentoId?: string;
  atencionId?: string;
  tipo?: TipoMovimiento;
  fechaDesde?: string;
  fechaHasta?: string;
}

/**
 * Estadística de medicamentos más dispensados
 */
export interface EstadisticaDispensacion {
  medicamentoId: string;
  medicamentoNombre: string;
  cantidadTotal: number;
  numeroMovimientos: number;
}

// ── Repository Interface (Puerto en Clean Architecture) ───────────────────────

/**
 * Contrato para el repositorio de movimientos
 * Define las operaciones disponibles sin especificar implementación
 */
export interface MovimientoRepository {
  /**
   * Registra un nuevo movimiento y actualiza el stock del medicamento
   * @throws {StockError} Si hay error de validación o stock insuficiente
   */
  registrar(input: CrearMovimientoInput, businessId: string): Promise<RegistroMovimientoResult>;

  /**
   * Obtiene movimientos filtrados por medicamento
   */
  listarPorMedicamento(medicamentoId: string, businessId: string): Promise<MovimientoStock[]>;

  /**
   * Obtiene todos los movimientos con nombre del medicamento (JOIN)
   */
  listarTodosConMedicamento(businessId: string): Promise<MovimientoConMedicamento[]>;

  /**
   * Obtiene estadísticas de los medicamentos más dispensados
   */
  obtenerEstadisticasDispensados(
    businessId: string,
    limite?: number
  ): Promise<EstadisticaDispensacion[]>;
}
