/**
 * @module core/db/dexie/types
 * ÚNICA fuente de verdad para BaseEntity y SyncStatus.
 * Todas las features deben importar desde aquí, NO redefinir localmente.
 */

export type SyncStatus = 'synced' | 'pending' | 'failed';

/**
 * Contrato base que deben cumplir TODAS las entidades de la aplicación.
 * - `sync_status`: ciclo de vida de sincronización offline-first.
 * - `deleted_at`:  soft-delete para no perder historial.
 */
export interface BaseEntity {
  id: string;
  creado_at: string;
  actualizado_at: string;
  sync_status: SyncStatus;
  deleted_at?: string;
}
