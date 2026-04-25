/**
 * @module core/db/dexie/utils/clearDatabase
 * Utilidad para limpiar completamente la base de datos local
 */

import { db } from '../db';

/**
 * Limpia completamente IndexedDB y empieza desde cero.
 * Úsala con precaución: borra TODOS los datos locales.
 *
 * Después de eliminar la base de datos, recarga la página automáticamente
 * para que la aplicación se reinicie con una base de datos vacía.
 */
export async function clearDatabase(): Promise<void> {
  console.log('[DB] Limpiando base de datos local...');
  await db.delete();
  console.log('[DB] Base de datos local eliminada. Recarga la página para empezar desde cero.');
  window.location.reload();
}
