// ───────────────────────────────────────────────────────────────────────────────
// MIGRATION v17
// Crear tabla sync_metadata para sincronización incremental
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Migración para crear tabla sync_metadata.
 * La tabla se crea automáticamente con la definición de stores en db.version().
 * Esta función solo registra la creación para logging.
 */
export async function migrateV17(): Promise<void> {
  console.log('[DB v17] Creando tabla sync_metadata para sincronización incremental...');
  // La tabla se crea automáticamente con la definición de stores
  console.log('[DB v17] Tabla sync_metadata creada exitosamente');
}
