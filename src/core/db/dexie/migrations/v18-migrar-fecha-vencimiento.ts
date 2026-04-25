// ───────────────────────────────────────────────────────────────────────────────
// MIGRATION v18
// Sistema de vencimiento - convertir fechas en descripcion_movimiento
// ───────────────────────────────────────────────────────────────────────────────

import type { Table } from 'dexie';

/**
 * Migración para sistema de vencimiento.
 * Convierte fechas almacenadas en descripcion_movimiento al campo fecha_vencimiento.
 */
export async function migrateV18(tx: { table: (name: string) => Table }): Promise<void> {
  console.log('[DB v18] Iniciando migración para sistema de vencimiento...');

  const movements = await tx.table('movimientos_stock').toArray();
  let migratedCount = 0;

  for (const movement of movements) {
    // Solo procesar movimientos de entrada con descripcion_movimiento
    if (movement.tipo === 'ENTRADA' && movement.descripcion_movimiento) {
      const desc = movement.descripcion_movimiento.trim();

      // Verificar si es una fecha en formato YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(desc)) {
        const date = new Date(desc);
        // Validar que sea una fecha válida
        if (!isNaN(date.getTime())) {
          await tx.table('movimientos_stock').update(movement.id, {
            fecha_vencimiento: desc,
            descripcion_movimiento: undefined, // Limpiar descripción si era fecha
            sync_status: 'pending', // Forzar re-sincronización
          });
          migratedCount++;
        }
      }
    }
  }

  console.log(`[DB v18] Migración completada: ${migratedCount} movimientos migrados a fecha_vencimiento`);
}
