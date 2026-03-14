import { db } from '../db';
import { TipoMovimiento } from '@/features/inventario/types';

/**
 * Actualiza el `stock_actual` de un medicamento basado en un movimiento de inventario.
 * IMPORTANTE: Esta función debe ejecutarse SIEMPRE dentro de una transacción Dexie
 * para garantizar consistencia de datos.
 *
 * @param medicamentoId  ID del medicamento a actualizar
 * @param cantidad       Cantidad a sumar (ENTRADA) o restar (SALIDA)
 * @param tipo           'ENTRADA' o 'SALIDA' (según el esquema SQL)
 * @param timestamp      ISO string del momento del movimiento
 */
export async function updateMedicamentoStock(
  medicamentoId: string,
  cantidad: number,
  tipo: TipoMovimiento,
  timestamp: string
) {
  const med = await db.medicamentos.get(medicamentoId);
  if (!med) return;

  const stockActual = med.stock_actual ?? 0;
  const nuevoStock = tipo === 'ENTRADA'
    ? stockActual + cantidad
    : Math.max(0, stockActual - cantidad); // Nunca negativo localmente

  await db.medicamentos.update(medicamentoId, {
    stock_actual: nuevoStock,
    actualizado_at: timestamp,
    sync_status: 'pending',
  });
}
