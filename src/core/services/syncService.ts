
import { db } from '@/core/db/dexie/db';
import { supabase } from '@/core/db/supabase/client';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import Dexie, { Table } from 'dexie';

const TABLES_CONFIG: Record<string, { timestampCol?: string, omitCols: string[] }> = {
    'instituciones': { timestampCol: 'creado_at', omitCols: ['sync_status', 'deleted_at', 'activo'] },
    'perfiles': { timestampCol: 'actualizado_at', omitCols: ['sync_status', 'deleted_at'] },
    'programas_estudio': { timestampCol: null as any, omitCols: ['sync_status', 'deleted_at', 'creado_at', 'actualizado_at'] },
    'pacientes': { timestampCol: 'creado_at', omitCols: ['sync_status', 'deleted_at', 'actualizado_at'] },
    'medicamentos': { timestampCol: 'creado_at', omitCols: ['sync_status', 'deleted_at', 'actualizado_at', 'stock_actual'] },
    'atenciones': { timestampCol: 'fecha_atencion', omitCols: ['sync_status', 'deleted_at', 'creado_at', 'actualizado_at'] },
    'movimientos_stock': { timestampCol: 'fecha_movimiento', omitCols: ['sync_status', 'deleted_at', 'creado_at', 'actualizado_at'] },
    'security_audit_log': { timestampCol: 'timestamp', omitCols: ['sync_status'] }, // FASE 4.3: Audit trail
};

// El orden de las tablas es CRÍTICO para evitar errores de Foreign Key en Supabase
const TABLES = [
    'instituciones',
    'perfiles',
    'programas_estudio',
    'pacientes',
    'medicamentos',
    'atenciones',
    'movimientos_stock',
    'security_audit_log' // FASE 4.3: Audit trail se sincroniza al final
];

export class SyncService {
    private isSyncing = false;
    private channels: RealtimeChannel[] = [];

    async sync() {
        if (this.isSyncing) return;
        this.isSyncing = true;
        console.log('Starting sync...');

        try {
            if (navigator.onLine) {
                await this.syncDown(); // Primero bajamos cambios para evitar conflictos
                await this.syncUp();
                console.log('Sync completed successfully.');
            } else {
                console.log('Offline: skipping sync.');
            }
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    private async syncUp() {
        console.log('Syncing pending changes to Supabase...');
        for (const tableName of TABLES) {
            const table: Table<any, any> = (db as any)[tableName];

            const pendingItems = await table.where('sync_status').equals('pending').toArray();

            if (pendingItems.length > 0) {
                console.log(`Found ${pendingItems.length} pending items in ${tableName}.`);

                // Prepara los datos para el upsert, removiendo metadatos dev/locales omitCols
                const remoteData = pendingItems.map(item => {
                    const cleanItem = { ...item };
                    const colsToOmit = TABLES_CONFIG[tableName].omitCols || [];
                    for (const col of colsToOmit) {
                        delete cleanItem[col];
                    }

                    // Mapeo de booleano para Supabase (Dexie usa 1/0 para índices)
                    if ('activo' in cleanItem && typeof (cleanItem as any).activo === 'number') {
                        (cleanItem as any).activo = (cleanItem as any).activo === 1;
                    }

                    return cleanItem;
                });

                try {
                    const { error } = await supabase
                        .from(tableName)
                        .upsert(remoteData, { onConflict: 'id' }); // 'id' debe ser tu PK

                    if (error) throw error;

                    // Si el lote se subió correctamente, actualiza el estado local de esos items
                    const idsToUpdate = pendingItems.map(item => item.id);
                    await table.bulkUpdate(idsToUpdate.map(id => ({ key: id, changes: { sync_status: 'synced' } })));
                    console.log(`Successfully synced ${idsToUpdate.length} items from ${tableName}.`);

                } catch (err: any) {
                    console.error(`Failed to sync batch from ${tableName}:`, err?.message || err);
                }
            }
        }
    }

    private async syncDown() {
        console.log('Pulling changes from Supabase...');
        const lastSync = localStorage.getItem('last_sync_timestamp');
        const now = new Date().toISOString();

        for (const tableName of TABLES) {
            let query = supabase.from(tableName).select('*');

            const config = TABLES_CONFIG[tableName];
            if (lastSync && config.timestampCol) {
                query = query.gt(config.timestampCol, lastSync);
            }

            const { data, error } = await query;

            if (error) {
                console.error(`Failed to pull ${tableName}`, error);
                continue;
            }

            if (data && data.length > 0) {
                console.log(`Pulled ${data.length} items for ${tableName} from Supabase.`);
                const table: Table<any, any> = (db as any)[tableName];

                // Procesamiento por lotes (batching) para no bloquear el hilo principal
                const BATCH_SIZE = 50;
                for (let i = 0; i < data.length; i += BATCH_SIZE) {
                    const batch = data.slice(i, i + BATCH_SIZE);
                    const dataToPut = batch.map(row => {
                        const localItem = { ...row, sync_status: 'synced' };
                        if ('activo' in localItem && typeof localItem.activo === 'boolean') {
                            localItem.activo = localItem.activo ? 1 : 0;
                        }
                        return localItem;
                    });

                    await table.bulkPut(dataToPut);
                    // Pequeño respiro para la UI si hay muchos datos
                    if (data.length > BATCH_SIZE) await new Promise(r => setTimeout(r, 10));
                }
            }
        }

        localStorage.setItem('last_sync_timestamp', now);
    }

    listenToChanges() {
        if (this.channels.length > 0) {
            // Silencio el log si ya están conectados para evitar spam en la consola
            return;
        }
        console.log('Attaching Supabase Realtime listeners...');

        const handleRealtimeChange = (tableName: string) => async (payload: any) => {
            console.log(`Realtime change in ${tableName}:`, payload);
            const table: Table<any, any> = (db as any)[tableName];

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const localItem = { ...payload.new, sync_status: 'synced' };
                if ('activo' in localItem && typeof localItem.activo === 'boolean') {
                    localItem.activo = localItem.activo ? 1 : 0;
                }
                await table.put(localItem);
            } else if (payload.eventType === 'DELETE') {
                const existing = await table.get(payload.old.id);
                if (existing) {
                    await table.delete(payload.old.id);
                }
            }
        };

        this.channels = TABLES.map(tableName => {
            const channel = supabase.channel(`public:${tableName}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, handleRealtimeChange(tableName))
                .subscribe((status, err) => {
                    if (status === 'SUBSCRIBED') {
                        console.log(`Subscribed to ${tableName}`);
                    }
                    if (err) {
                        console.error(`Subscription error on ${tableName}:`, err);
                    }
                });
            return channel;
        });
    }

    async stopListening() {
        await Promise.all(this.channels.map(ch => ch.unsubscribe()));
        this.channels = [];
    }
}

export const syncService = new SyncService();
