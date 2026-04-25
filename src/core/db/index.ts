/**
 * @module core/db
 * Punto de entrada canónico para la capa de datos (Dexie + Supabase + Sync).
 * Importar siempre desde '@/core/db' y no directamente desde subdirectorios.
 */

// Dexie (IndexedDB local)
export { db, generateUUID } from './dexie/db';
export type { BaseEntity, SyncStatus } from './dexie/types';

// Supabase (Base de datos remota)
export { supabase } from './supabase';
// NOTA: supabaseAdmin no se exporta aquí para evitar error de runtime
// cuando falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY.
// Importar directamente desde '@/core/db/supabase/admin' en Server Actions.
// TODO: Agregar export de Database types cuando se generen
// export type { Database } from './supabase/types';

// Sync (Sincronización bidireccional)
export { syncService, SyncService } from './sync';
