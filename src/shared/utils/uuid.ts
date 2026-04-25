/**
 * @module shared/utils/uuid
 * Utilidad para generar UUIDs localmente (necesaria para offline-first)
 */

/**
 * Genera un UUID v4 utilizando la API nativa de crypto cuando está disponible,
 * con un fallback para navegadores que no la soportan.
 *
 * @returns UUID string en formato estándar
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback simple para navegadores sin crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
