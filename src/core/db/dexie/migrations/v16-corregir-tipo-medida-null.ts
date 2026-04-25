// ───────────────────────────────────────────────────────────────────────────────
// MIGRATION v16
// Corregir tipo_medida NULL en movimientos_stock existentes
// ───────────────────────────────────────────────────────────────────────────────

import type { Table } from 'dexie';

/**
 * Migración definitiva para corregir tipo_medida NULL en movimientos_stock.
 * Obtiene el tipo_medida del medicamento asociado o usa 'UNIDAD' como fallback.
 */
export async function migrateV16(tx: { table: (name: string) => Table }): Promise<void> {
  console.log('[DB v16] Iniciando migración para corregir tipo_medida NULL...');

  const movements = await tx.table('movimientos_stock').toArray();
  let correctedCount = 0;

  for (const movement of movements) {
    if (!movement.tipo_medida) {
      // Obtener tipo_medida del medicamento o usar UNIDAD como fallback
      const medicamento = await tx.table('medicamentos').get(movement.medicamento_id);
      const tipoMedida = medicamento?.tipo_medida || 'UNIDAD';

      await tx.table('movimientos_stock').update(movement.id, {
        tipo_medida: tipoMedida,
        sync_status: 'pending', // Forzar re-sincronización
      });

      correctedCount++;
    }
  }

  console.log(`[DB v16] Migración completada: ${correctedCount} movimientos corregidos`);
}
