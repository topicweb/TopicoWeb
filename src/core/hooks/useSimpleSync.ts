/**
 * @fileoverview Hook de sincronización simple (PUSH only)
 * @description Estrategia "Local always wins, push when online".
 * Sincroniza datos pendientes desde IndexedDB hacia Supabase.
 * @module useSimpleSync
 * @see useDataMigrations - Para migraciones de datos
 * @see useBidirectionalSync - Para sincronización completa (PULL + PUSH)
 */

import { useEffect } from 'react';
import { db } from '@/core/db/dexie/db';
import { supabase } from '@/core/db/supabase';
import { toast } from 'sonner';

/** Tablas en orden de sincronización (respetando foreign keys) */
const TABLES = ['instituciones', 'pacientes', 'medicamentos', 'atenciones', 'movimientos_stock'];

/** Tablas sin timestamps en Supabase (excluir creado_at/actualizado_at) */
const TABLES_WITHOUT_TIMESTAMPS: string[] = ['movimientos_stock'];

/** Tablas sin business_id (instituciones usa su propio id) */
const TABLES_WITHOUT_BUSINESS_ID = ['instituciones'];

/**
 * Hook para sincronización PUSH simple (local → Supabase)
 * 
 * @param enabled - Activa/desactiva la sincronización automática
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { user } = useAuth();
 *   useSimpleSync(!!user); // Sincroniza solo cuando hay usuario
 * }
 * ```
 */
export function useSimpleSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !navigator.onLine) return;

    const syncPending = async () => {
      for (const tableName of TABLES) {
        const table = (db as any)[tableName];
        let pending = await table.where('sync_status').equals('pending').toArray();

        if (pending.length === 0) continue;

        // Limpiar metadatos locales antes de enviar
        const cleanData = pending.map((item: any) => {
          const { deleted_at, ...rest } = item;

          // Convertir activo a boolean para Supabase
          if ('activo' in rest) {
            rest.activo = rest.activo === 1 || rest.activo === true;
          }

          // Eliminar business_id de tablas que no lo tienen
          if (TABLES_WITHOUT_BUSINESS_ID.includes(tableName) && 'business_id' in rest) {
            delete rest.business_id;
          }

          // Eliminar timestamps de tablas que no los tienen
          if (TABLES_WITHOUT_TIMESTAMPS.includes(tableName)) {
            delete rest.creado_at;
            delete rest.actualizado_at;
          }

          // Asignar tipo_medida por defecto si es NULL
          if (tableName === 'movimientos_stock' && !rest.tipo_medida) {
            rest.tipo_medida = 'UNIDAD';
          }

          return rest;
        });

        const { error } = await supabase.from(tableName).upsert(cleanData, { onConflict: 'id' });

        if (error) {
          console.error(`[useSimpleSync] Error sincronizando ${tableName}:`, {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });

          // Conflicto = registro ya existe, marcar como synced
          if (error.code === '409' || error.code === '23505') {
            console.warn(`[useSimpleSync] Conflicto en ${tableName} - marcando como synced`);
            const ids = pending.map((p: any) => p.id);
            await table.bulkUpdate(ids.map((id: string) => ({
              key: id,
              changes: { sync_status: 'synced' }
            })));
          } else if (error.code === '23503') {
            // FK violation = mantener pending para reintento
            console.warn(`[useSimpleSync] FK violation en ${tableName} - se reintentará`);
          } else {
            toast.error(`Error sincronizando ${tableName}: ${error.message || 'Error desconocido'}`);
          }
          continue;
        }

        // Marcar como sincronizado
        const ids = pending.map((p: any) => p.id);
        await table.bulkUpdate(ids.map((id: string) => ({
          key: id,
          changes: { sync_status: 'synced' }
        })));
      }
    };

    syncPending();

    // Reintentar cuando vuelve la conexión
    const handleOnline = () => syncPending();
    window.addEventListener('online', handleOnline);

    return () => window.removeEventListener('online', handleOnline);
  }, [enabled]);
}
