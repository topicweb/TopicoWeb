/**
 * Servicio de Sincronización Bidireccional
 * 
 * Estrategia:
 * - PULL: Descargar datos de Supabase al inicio y en cambios remotos
 * - PUSH: Subir datos locales pendientes
 * - Conflictos: Last Write Wins basado en actualizado_at
 * - Sincronización Híbrida: Completa para nuevos dispositivos, incremental para conocidos
 */
import { db } from '@/core/db';
import { supabase } from '@/core/db/supabase/client';
import type { BaseEntity } from '@/core/db/dexie/types';
import { getDeviceId } from '@/core/utils/deviceId';

// Tablas para PULL (descargar de Supabase): incluye perfiles para mantener datos actualizados
const PULL_TABLES = ['instituciones', 'perfiles', 'programas_estudio', 'pacientes', 'medicamentos', 'atenciones', 'movimientos_stock'];

// Tablas para PUSH (subir a Supabase): excluye perfiles (gestionado por Auth trigger) y programas_estudio (read-only)
const PUSH_TABLES = ['instituciones', 'pacientes', 'medicamentos', 'atenciones', 'movimientos_stock'];
// Tablas en Supabase que NO tienen columnas creado_at/actualizado_at
// Estas tablas no pueden usar PULL incremental, siempre hacen PULL completo
// Después de la migración, todas las tablas tienen actualizado_at, así que esta lista está vacía
const TABLES_WITHOUT_TIMESTAMPS: string[] = [];

// Tablas que NO tienen business_id (instituciones.id IS the business_id)
const TABLES_WITHOUT_BUSINESS_ID = ['instituciones'];

export class SyncService {
  private static instance: SyncService;
  private isPulling = false;
  private isPushing = false;

  private constructor() { }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Verifica si el dispositivo es conocido (ya ha sincronizado antes)
   * Retorna el lastSync timestamp si existe, null si es dispositivo nuevo
   */
  private async getDeviceSyncStatus(businessId: string): Promise<{ isKnown: boolean; lastSync: string | null }> {
    const deviceId = getDeviceId();
    const metadata = await db.sync_metadata.where({ deviceId, businessId }).first();

    if (metadata) {
      console.log('[SyncService] Dispositivo conocido, última sync:', metadata.lastSync);
      return { isKnown: true, lastSync: metadata.lastSync };
    }

    console.log('[SyncService] Dispositivo nuevo, se hará PULL completo');
    return { isKnown: false, lastSync: null };
  }

  /**
   * Actualiza el timestamp de última sincronización para este dispositivo
   */
  private async updateLastSync(businessId: string): Promise<void> {
    const deviceId = getDeviceId();
    const now = new Date().toISOString();

    await db.sync_metadata.put({
      deviceId,
      businessId,
      lastSync: now
    });
  }

  /**
   * PULL: Descargar datos de Supabase para un business_id
   * Estrategia Híbrida:
   * - Dispositivo nuevo: PULL completo (todos los datos)
   * - Dispositivo conocido: PULL incremental (solo cambios desde última sync)
   * NOTA: instituciones.id IS the business_id, so we fetch all institutions first
   */
  async pullFromSupabase(businessId: string): Promise<void> {
    if (this.isPulling) {
      return;
    }

    this.isPulling = true;

    try {
      // Detectar si es dispositivo nuevo o conocido
      const { isKnown, lastSync } = await this.getDeviceSyncStatus(businessId);

      // 1. Primero fetch todas las instituciones (sin filtro, siempre completo)
      const { data: instituciones, error: institucionesError } = await supabase
        .from('instituciones')
        .select('*');

      if (institucionesError) {
        console.error('[SyncService] Error PULL instituciones:', institucionesError);
      } else if (instituciones && instituciones.length > 0) {
        await db.instituciones.bulkPut(instituciones);
      }

      // 2. Fetch otras tablas filtrando por business_id
      for (const tableName of PULL_TABLES) {
        if (tableName === 'instituciones') continue; // Ya procesado arriba

        let query = supabase.from(tableName).select('*').eq('business_id', businessId);

        // Para dispositivos conocidos, usar filtro incremental SOLO si la tabla tiene actualizado_at
        if (isKnown && lastSync && !TABLES_WITHOUT_TIMESTAMPS.includes(tableName)) {
          query = query.gt('actualizado_at', lastSync);
        }

        const { data, error } = await query;

        if (error) {
          console.error(`[SyncService] Error PULL ${tableName}:`, error);
          continue;
        }

        if (!data || data.length === 0) {
          continue;
        }

        // Normalizar datos de Supabase para Dexie
        // - activo: boolean -> 1/0
        // - sync_status: siempre 'synced' (los datos de Supabase ya están sincronizados)
        const normalizedData = data.map((item: any) => ({
          ...item,
          activo: typeof item.activo === 'boolean' ? (item.activo ? 1 : 0) : item.activo,
          sync_status: 'synced',
        }));

        // Upsert en Dexie local
        const table = (db as any)[tableName];
        await table.bulkPut(normalizedData);
      }

      // Actualizar timestamp de última sincronización
      await this.updateLastSync(businessId);
    } catch (error) {
      console.error('[SyncService] Error en PULL:', error);
      throw error;
    } finally {
      this.isPulling = false;
    }
  }

  /**
   * PUSH: Subir datos locales pendientes a Supabase
   * Similar a useSimpleSync pero como servicio reutilizable
   */
  async pushToSupabase(): Promise<void> {
    if (this.isPushing) {
      return;
    }

    this.isPushing = true;

    try {
      for (const tableName of PUSH_TABLES) {
        const table = (db as any)[tableName];
        let pending = await table.where('sync_status').equals('pending').toArray();

        if (pending.length === 0) continue;

        // VALIDACIÓN DE FOREIGN KEY: Filtrar movimientos con medicamento_id inválido
        if (tableName === 'movimientos_stock') {
          const medicamentoIds = new Set((await db.medicamentos.toArray()).map(m => m.id));
          const validMovements = pending.filter((m: any) => medicamentoIds.has(m.medicamento_id));

          if (validMovements.length < pending.length) {
            const invalidCount = pending.length - validMovements.length;
            console.warn(`[SyncService] Filtrados ${invalidCount} movimientos con medicamento_id inválido`);

            const invalidIds = pending
              .filter((m: any) => !medicamentoIds.has(m.medicamento_id))
              .map((m: any) => m.id);

            await table.bulkUpdate(invalidIds.map((id: string) => ({
              key: id,
              changes: { sync_status: 'failed' }
            })));
          }

          pending = validMovements;
          if (pending.length === 0) continue;
        }

        // Limpiar metadatos locales antes de enviar
        const cleanData = pending.map((item: any) => {
          const { sync_status, deleted_at, ...rest } = item;

          // Convertir activo a boolean para Supabase (soporta 1/0 y true/false)
          if ('activo' in rest) {
            rest.activo = rest.activo === 1 || rest.activo === true;
          }

          // Eliminar timestamps de tablas que no los tienen en Supabase
          if (TABLES_WITHOUT_TIMESTAMPS.includes(tableName)) {
            delete rest.creado_at;
            delete rest.actualizado_at;
          }

          // Asignar valor por defecto para tipo_medida si es NULL
          if (tableName === 'movimientos_stock' && !rest.tipo_medida) {
            rest.tipo_medida = 'UNIDAD';
          }

          return rest;
        });

        const { error } = await supabase.from(tableName).upsert(cleanData, { onConflict: 'id' });

        if (error) {
          console.error(`[SyncService] Error PUSH ${tableName}:`, error);
          continue;
        }

        // Marcar como sincronizado
        const ids = pending.map((p: any) => p.id);
        await table.bulkUpdate(ids.map((id: string) => ({ key: id, changes: { sync_status: 'synced' } })));
        console.log(`[SyncService] PUSH ${tableName}: ${ids.length} registros`);
      }

      console.log('[SyncService] PUSH completado exitosamente');
    } catch (error) {
      console.error('[SyncService] Error en PUSH:', error);
      throw error;
    } finally {
      this.isPushing = false;
    }
  }

  /**
   * Resolución de conflictos: Last Write Wins
   * Compara timestamps y decide qué versión mantener
   */
  async resolveConflict(tableName: string, id: string): Promise<void> {
    const table = (db as any)[tableName];
    const localItem = await table.get(id);

    if (!localItem) return;

    const { data: remoteItem } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (!remoteItem) return;

    // Comparar timestamps (usando creado_at ya que actualizado_at no existe en Supabase)
    const localTime = new Date(localItem.creado_at).getTime();
    const remoteTime = new Date(remoteItem.creado_at).getTime();

    if (remoteTime > localTime) {
      // Remoto gana, actualizar local
      await table.put(remoteItem);
    } else {
      // Local gana, subir a remoto
      const { sync_status, deleted_at, ...rest } = localItem;
      await supabase.from(tableName).upsert(rest, { onConflict: 'id' });
      await table.update(id, { sync_status: 'synced' });
    }
  }

  /**
   * Sincronización completa: PULL + PUSH
   */
  async fullSync(businessId: string): Promise<void> {
    await this.pullFromSupabase(businessId);
    await this.pushToSupabase();
  }
}

export const syncService = SyncService.getInstance();
