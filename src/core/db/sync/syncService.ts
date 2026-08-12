/**
 * @fileoverview Servicio de Sincronización Bidireccional (PULL/PUSH)
 * @description Implementa sincronización offline-first entre Dexie (IndexedDB) y Supabase.
 * 
 * Estrategias implementadas:
 * - PULL: Descarga datos desde Supabase al iniciar
 * - PUSH: Sube datos locales pendientes automáticamente
 * - Conflictos: Last Write Wins basado en timestamps
 * - Sincronización Híbrida: Completa para nuevos dispositivos, incremental para conocidos
 * 
 * @module SyncService
 * @see useBidirectionalSync - Hook React que consume este servicio
 */

import { db } from '@/core/db';
import { supabase } from '@/core/db/supabase';
import { getDeviceId } from '@/core/utils/deviceId';
import { logger } from '@/core/utils/logger';
import { withRetry } from '@/core/utils/retry';
import type { Paciente } from '@/features/pacientes/types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES DE CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

/** Tablas para PULL (descargar de Supabase) - incluye perfiles para mantener datos actualizados */
const PULL_TABLES = [
  'instituciones',
  'perfiles',
  'programas_estudio',
  'pacientes',
  'medicamentos',
  'atenciones',
  'movimientos_stock'
] as const;

/** Tablas para PUSH (subir a Supabase) - excluye perfiles y programas_estudio */
const PUSH_TABLES = [
  'instituciones',
  'pacientes',
  'medicamentos',
  'atenciones',
  'movimientos_stock'
] as const;

/** Tablas sin columnas timestamp (movimientos_stock no tiene creado_at/actualizado_at en Supabase) */
const TABLES_WITHOUT_TIMESTAMPS: string[] = ['movimientos_stock'];

/** Tablas sin business_id (instituciones usa su propio id) */
const TABLES_WITHOUT_BUSINESS_ID = ['instituciones'];

export class SyncService {
  private static instance: SyncService;
  private isPulling = false;
  private isPushing = false;
  private pendingPulls: string[] = []; // CRITICAL: Cola de businessIds pendientes
  private readonly MAX_QUEUE_SIZE = 10; // Límite de cola para evitar memory leaks
  private lastFullSyncTime = 0;
  private readonly SYNC_COOLDOWN = 60000; // 1 minuto mínimo entre syncs completos

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
      return { isKnown: true, lastSync: metadata.lastSync };
    }

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
    // CRITICAL FIX: Si ya está sincronizando, encolar para procesar después
    if (this.isPulling) {
      if (!this.pendingPulls.includes(businessId)) {
        // Limitar tamaño de cola
        if (this.pendingPulls.length >= this.MAX_QUEUE_SIZE) {
          this.pendingPulls.shift(); // Remover el más antiguo
        }
        this.pendingPulls.push(businessId);
      }
      return;
    }

    this.isPulling = true;

    try {
      // Detectar si es dispositivo nuevo o conocido
      const { isKnown, lastSync } = await this.getDeviceSyncStatus(businessId);

      // 1. Primero fetch todas las instituciones (sin filtro, siempre completo)
      const { data: instituciones, error: institucionesError } = await withRetry(
        async () => {
          const result = await supabase.from('instituciones').select('*');
          return result;
        },
        { maxRetries: 2 }
      );

      if (institucionesError) {
        logger.error('[SyncService] Error PULL instituciones:', institucionesError);
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

        const { data, error } = await withRetry(
          async () => {
            const result = await query;
            return result;
          },
          { maxRetries: 2, shouldRetry: (err) => !String(err).includes('404') }
        );

        if (error) {
          logger.error(`[SyncService] Error PULL ${tableName}:`, error);
          continue;
        }

        if (!data || data.length === 0) {
          continue;
        }

        // LOG: Mostrar datos descargados (solo en desarrollo)
        if (process.env.NODE_ENV === 'development' && tableName === 'programas_estudio') {
          logger.debug('[SyncService] Programas descargados de Supabase:', data.map((p: any) => ({ id: p.id, nombre: p.nombre })));
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

        // LOG: Verificar datos en Dexie después de bulkPut (solo en desarrollo)
        if (process.env.NODE_ENV === 'development' && tableName === 'programas_estudio') {
          const localPrograms = await db.programas_estudio.toArray();
          logger.debug('[SyncService] Programas en Dexie después de bulkPut:', localPrograms.map((p: any) => ({ id: p.id, nombre: p.nombre })));
        }
      }

      // Actualizar timestamp de última sincronización
      await this.updateLastSync(businessId);
    } catch (error) {
      logger.error('[SyncService] Error en PULL:', error);
      throw error;
    } finally {
      this.isPulling = false;

      // CRITICAL FIX: Procesar siguiente PULL en cola si existe
      if (this.pendingPulls.length > 0) {
        const nextBusinessId = this.pendingPulls.shift();
        // Usar setTimeout para evitar recursion profunda
        setTimeout(() => {
          if (nextBusinessId) {
            this.pullFromSupabase(nextBusinessId).catch(console.error);
          }
        }, 100);
      }
    }
  }

  /**
   * Normaliza activo (Dexie 1/0 ↔ Supabase boolean)
   */
  private normalizeActivo(value: unknown): number {
    return value === true || value === 1 ? 1 : 0;
  }

  /**
   * Resuelve duplicados de paciente por (business_id, dni).
   * Ocurre cuando el registro local tiene un id distinto al de Supabase
   * (p. ej. creado offline antes del PULL o en otro dispositivo).
   */
  private async reconcilePacienteByDni(
    local: Record<string, unknown>
  ): Promise<void> {
    const businessId = local.business_id as string | undefined;
    const dni = local.dni as string | undefined;
    const localId = local.id as string | undefined;

    if (!businessId || !dni || !localId) return;

    const { data: remote, error } = await supabase
      .from('pacientes')
      .select('*')
      .eq('business_id', businessId)
      .eq('dni', dni)
      .maybeSingle();

    if (error) {
      logger.warn('[SyncService] No se pudo verificar paciente remoto por DNI:', error);
      return;
    }

    if (!remote || remote.id === localId) return;

    const remoteId = remote.id as string;
    logger.info(
      `[SyncService] Paciente DNI ${dni}: fusionando id local ${localId} → remoto ${remoteId}`
    );

    const atenciones = await db.atenciones
      .where('paciente_id')
      .equals(localId)
      .toArray();

    for (const atencion of atenciones) {
      await db.atenciones.update(atencion.id, {
        paciente_id: remoteId,
        sync_status: 'pending',
      });
    }

    const localTime = new Date(
      (local.actualizado_at as string) || (local.creado_at as string)
    ).getTime();
    const remoteTime = new Date(
      (remote.actualizado_at as string) || (remote.creado_at as string)
    ).getTime();

    if (localTime >= remoteTime) {
      const merged: Paciente = {
        ...(local as unknown as Paciente),
        id: remoteId,
        activo: this.normalizeActivo(local.activo),
        sync_status: 'pending',
      };
      await db.pacientes.put(merged);
    } else {
      const adopted: Paciente = {
        ...(remote as unknown as Paciente),
        activo: this.normalizeActivo(remote.activo),
        sync_status: 'synced',
      };
      await db.pacientes.put(adopted);
    }

    await db.pacientes.delete(localId);
  }

  /**
   * Limpia metadatos locales antes de enviar a Supabase
   */
  private cleanRecordForPush(tableName: string, item: Record<string, unknown>): Record<string, unknown> {
    const { sync_status, deleted_at, ...rest } = item;

    if ('activo' in rest) {
      rest.activo = rest.activo === 1 || rest.activo === true;
    }

    if (TABLES_WITHOUT_TIMESTAMPS.includes(tableName)) {
      delete rest.creado_at;
      delete rest.actualizado_at;
    }

    if (tableName === 'movimientos_stock' && !rest.tipo_medida) {
      rest.tipo_medida = 'UNIDAD';
    }

    return rest;
  }

  /**
   * Ejecuta upsert y marca registros como synced
   */
  private async upsertAndMarkSynced(
    tableName: string,
    table: { bulkUpdate: (updates: { key: string; changes: { sync_status: string } }[]) => Promise<number> },
    pending: Record<string, unknown>[]
  ): Promise<{ error: { code?: string; message?: string } | null }> {
    const cleanData = pending.map((item) => this.cleanRecordForPush(tableName, item));

    const { error } = await withRetry(
      async () => {
        const result = await supabase.from(tableName).upsert(cleanData, { onConflict: 'id' });
        return result;
      },
      { maxRetries: 2 }
    );

    if (error) return { error };

    const ids = pending.map((p) => p.id as string);
    await table.bulkUpdate(
      ids.map((id) => ({ key: id, changes: { sync_status: 'synced' } }))
    );

    return { error: null };
  }

  /**
   * PUSH: Subir datos locales pendientes a Supabase
   * Similar a useSimpleSync pero como servicio reutilizable
   */
  async pushToSupabase(): Promise<void> {
    if (this.isPushing) {
      logger.warn('[SyncService] ⚠️ PUSH ya en progreso, omitiendo');
      return;
    }

    this.isPushing = true;
    logger.info('[SyncService] 📤 Iniciando PUSH a Supabase');

    try {
      let totalPending = 0;
      for (const tableName of PUSH_TABLES) {
        const table = (db as any)[tableName];
        let pending = await table.where('sync_status').equals('pending').toArray();

        if (pending.length === 0) {
          logger.debug(`[SyncService] ✓ Tabla ${tableName}: 0 registros pendientes`);
          continue;
        }

        logger.info(`[SyncService] 📋 Tabla ${tableName}: ${pending.length} registros pendientes`);
        totalPending += pending.length;

        // VALIDACIÓN DE FOREIGN KEY: Filtrar movimientos con medicamento_id inválido
        if (tableName === 'movimientos_stock') {
          const medicamentoIds = new Set((await db.medicamentos.toArray()).map(m => m.id));
          const validMovements = pending.filter((m: any) => medicamentoIds.has(m.medicamento_id));

          if (validMovements.length < pending.length) {
            const invalidCount = pending.length - validMovements.length;

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

        // Pacientes: resolver duplicados por (business_id, dni) antes del upsert
        if (tableName === 'pacientes') {
          for (const item of pending) {
            await this.reconcilePacienteByDni(item);
          }
          pending = await table.where('sync_status').equals('pending').toArray();
          if (pending.length === 0) {
            logger.debug('[SyncService] ✓ Tabla pacientes: conflictos DNI resueltos, nada pendiente');
            continue;
          }
        }

        let { error } = await this.upsertAndMarkSynced(tableName, table, pending);

        // Reintento si persiste conflicto de DNI único en Supabase
        if (error?.code === '23505' && tableName === 'pacientes') {
          logger.warn('[SyncService] Conflicto DNI en pacientes — reintentando con reconciliación');
          for (const item of pending) {
            await this.reconcilePacienteByDni(item);
          }
          pending = await table.where('sync_status').equals('pending').toArray();
          if (pending.length > 0) {
            ({ error } = await this.upsertAndMarkSynced(tableName, table, pending));
          } else {
            error = null;
          }
        }

        if (error) {
          logger.error(`[SyncService] Error PUSH ${tableName}:`, error);
          continue;
        }

        logger.debug(`[SyncService] ✅ ${tableName}: upsert exitoso`);
        logger.debug(`[SyncService] ✅ ${tableName}: ${pending.length} registros marcados como synced`);
      }

      logger.info(`[SyncService] 📊 Total registros sincronizados: ${totalPending}`);
    } catch (error) {
      logger.error('[SyncService] ❌ Error en PUSH:', error);
      throw error;
    } finally {
      this.isPushing = false;
      logger.debug('[SyncService] 🏁 PUSH finalizado');
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
   * Sincronización completa: PULL + PUSH con rate limiting
   */
  async fullSync(businessId: string): Promise<void> {
    const now = Date.now();
    const timeSinceLastSync = now - this.lastFullSyncTime;

    // Rate limiting: no permitir sync completos más frecuentes que SYNC_COOLDOWN
    if (timeSinceLastSync < this.SYNC_COOLDOWN) {
      logger.warn(`[SyncService] ⚠️ Sync en cooldown (${Math.ceil((this.SYNC_COOLDOWN - timeSinceLastSync) / 1000)}s restantes)`);
      return;
    }

    this.lastFullSyncTime = now;
    await this.pullFromSupabase(businessId);
    await this.pushToSupabase();
  }
}

export const syncService = SyncService.getInstance();
