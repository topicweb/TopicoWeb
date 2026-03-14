/**
 * @module core/db
 * Punto de entrada canónico para la capa de datos local (Dexie).
 * Importar siempre desde '@/core/db' y no directamente desde './dexie/db'.
 */
export { db, generateUUID } from './dexie/db';
