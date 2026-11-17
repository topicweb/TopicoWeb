// ───────────────────────────────────────────────────────────────────────────────
// STOCK LOGIC - PUBLIC API
// Re-exports para backward compatibility con la estructura anterior
// ───────────────────────────────────────────────────────────────────────────────

// Constants
export { TIPOS_MEDIDA_VALIDOS, TIPOS_MOVIMIENTO_VALIDOS, MAX_CANTIDAD_STOCK, ERROR_MESSAGES, UNIDADES_POR_TIPO } from './constants';

// Errors
export { StockError } from './errors';

// Validation
export {
  validarTipoMedida,
  validarTipoMovimiento,
  validarCantidad,
  validarCompatibilidadTipoMedida,
  validarStockSuficiente,
  validarLimiteDispensacion,
} from './validation';

// Operations
export { updateMedicamentoStock, verificarStockDisponible } from './operations';

// Grouping
export {
  agruparDispensacionesPorMedicamento,
  agruparDispensacionesPorTipoMedida,
  generarResumenPorTipoMedida,
  generarDescripcionMovimiento,
  type GrupoDispensacion,
} from './grouping';
