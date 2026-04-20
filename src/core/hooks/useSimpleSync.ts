/**
 * Hook simple de sincronización - Reemplaza SyncService (197 líneas → 40 líneas)
 * Estrategia: "Local always wins, push when online"
 */
import { useEffect } from 'react';
import { db } from '@/core/db/dexie/db';
import { supabase } from '@/core/db/supabase/client';

// Orden de sincronización: medicamentos DEBE ir antes que movimientos_stock (foreign key)
// NOTA: 
// - programas_estudio está excluido de PUSH (datos de configuración, read-only desde cliente)
// - perfiles está excluido (se crea automáticamente por trigger handle_new_user en Auth, sin política INSERT RLS)
const TABLES = ['instituciones', 'pacientes', 'medicamentos', 'atenciones', 'movimientos_stock'];

// Tablas en Supabase que NO tienen columnas creado_at/actualizado_at
// Estas columnas deben excluirse al sincronizar para evitar 400 Bad Request
// NOTA: movimientos_stock usa fecha_movimiento en lugar de creado_at
const TABLES_WITHOUT_TIMESTAMPS: string[] = ['movimientos_stock'];

// Tablas que NO tienen business_id (instituciones.id IS the business_id)
const TABLES_WITHOUT_BUSINESS_ID = ['instituciones'];

/**
 * Migración de datos: Corrige registros existentes con tipo_medida NULL
 * Se ejecuta una sola vez al inicio para limpiar datos corruptos
 */
export async function migrateNullTipoMedida() {
  try {
    // Obtener TODOS los movimientos, no solo los pendientes
    // Esto asegura que corregimos datos corruptos independientemente de su estado
    const allMovements = await db.movimientos_stock.toArray();

    if (allMovements.length === 0) return;

    console.log(`[Migración] Revisando ${allMovements.length} movimientos totales...`);

    let correctedCount = 0;

    for (const movement of allMovements) {
      // Verificar si tipo_medida es null o undefined
      if (!movement.tipo_medida) {
        // Intentar obtener tipo_medida del medicamento asociado
        const medicamento = await db.medicamentos.get(movement.medicamento_id);
        const tipoMedida = medicamento?.tipo_medida || 'UNIDAD';

        await db.movimientos_stock.update(movement.id, {
          tipo_medida: tipoMedida,
          sync_status: 'pending', // Marcar para re-sincronizar
        });

        correctedCount++;
        console.log(`[Migración] Corregido movimiento ${movement.id}: ${tipoMedida}`);
      }
    }

    if (correctedCount > 0) {
      console.log(`[Migración] Corregidos ${correctedCount} movimientos sin tipo_medida`);
    } else {
      console.log(`[Migración] Todos los movimientos tienen tipo_medida válido`);
    }
  } catch (error) {
    console.error('[Migración] Error corrigiendo tipo_medida:', error);
  }
}

/**
 * Migración de datos: Corrige registros con activo como boolean a 1/0
 * Esto soluciona el problema de sincronización donde activo llegaba como boolean desde Supabase
 * pero se necesita como número (1/0) en Dexie para consistencia
 */
export async function migrateActivoBooleanToNumber() {
  try {
    // Incluye medicamentos para que aparezcan en el MedicineDispenser (filtro: activo === 1)
    const tables = ['pacientes', 'medicamentos', 'programas_estudio'];
    let totalCorrected = 0;

    for (const tableName of tables) {
      const table = (db as any)[tableName];
      const allRecords = await table.toArray();

      for (const record of allRecords) {
        // Si activo es boolean, convertir a número (1 o 0)
        if (typeof record.activo === 'boolean') {
          await table.update(record.id, {
            activo: record.activo ? 1 : 0,
            sync_status: 'pending', // Marcar para re-sincronizar
          });
          totalCorrected++;
          console.log(`[Migración activo] Corregido ${tableName}.${record.id}: ${record.activo} → ${record.activo ? 1 : 0}`);
        }
      }
    }

    if (totalCorrected > 0) {
      console.log(`[Migración activo] Corregidos ${totalCorrected} registros con activo boolean → number`);
    }
  } catch (error) {
    console.error('[Migración activo] Error corrigiendo valores:', error);
  }
}

/**
 * Migración CRÍTICA: Corrige sync_status de perfiles de 'pending' a 'synced'
 * Los perfiles se gestionan via Server Actions, no por background sync.
 * Si tienen 'pending' nunca se sincronizarán porque están excluidos del PUSH.
 */
export async function migratePerfilesSyncStatus() {
  try {
    const allPerfiles = await db.perfiles.toArray();
    const pendingPerfiles = allPerfiles.filter((p: any) => p.sync_status === 'pending');

    if (pendingPerfiles.length === 0) return;

    console.log(`[Migración perfiles] Corrigiendo ${pendingPerfiles.length} perfiles con sync_status='pending' → 'synced'`);

    for (const perfil of pendingPerfiles) {
      await db.perfiles.update(perfil.id, {
        sync_status: 'synced',
      });
    }

    console.log(`[Migración perfiles] ${pendingPerfiles.length} perfiles corregidos a 'synced'`);
  } catch (error) {
    console.error('[Migración perfiles] Error corrigiendo sync_status:', error);
  }
}

/**
 * Hook para ejecutar migraciones de datos al iniciar la aplicación.
 * ESTE HOOK DEBE LLAMARSE UNA SOLA VEZ AL INICIO (ej: en AuthProvider).
 * Las migraciones corrigen inconsistencias de datos entre versiones.
 */
export function useDataMigrations() {
  useEffect(() => {
    // Ejecutar migraciones inmediatamente al montar, no esperar a sync
    const runMigrations = async () => {
      console.log('[useDataMigrations] Iniciando migraciones...');
      await migrateNullTipoMedida();
      await migrateActivoBooleanToNumber();
      await migratePerfilesSyncStatus();
      console.log('[useDataMigrations] Migraciones completadas');
    };

    runMigrations();
  }, []);
}

export function useSimpleSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !navigator.onLine) return;

    const syncPending = async () => {
      // Las migraciones ahora se ejecutan en useDataMigrations al inicio
      // No es necesario ejecutarlas aquí (ya se corrigieron los datos)

      for (const tableName of TABLES) {
        const table = (db as any)[tableName];
        let pending = await table.where('sync_status').equals('pending').toArray();

        if (pending.length === 0) continue;

        // VALIDACIÓN DE FOREIGN KEY: Filtrar movimientos con medicamento_id inválido
        if (tableName === 'movimientos_stock') {
          const medicamentoIds = new Set((await db.medicamentos.toArray()).map(m => m.id));
          const validMovements = pending.filter((m: any) => medicamentoIds.has(m.medicamento_id));

          if (validMovements.length < pending.length) {
            const invalidCount = pending.length - validMovements.length;
            console.warn(`[useSimpleSync] Filtrados ${invalidCount} movimientos con medicamento_id inválido`);

            // Marcar movimientos inválidos como failed para no reintentar
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
          const { deleted_at, ...rest } = item;

          // Convertir activo a boolean para Supabase (soporta 1/0 y true/false)
          if ('activo' in rest) {
            rest.activo = rest.activo === 1 || rest.activo === true;
          }

          // Eliminar business_id de tablas que no lo tienen (instituciones)
          if (TABLES_WITHOUT_BUSINESS_ID.includes(tableName) && 'business_id' in rest) {
            delete rest.business_id;
          }

          // Eliminar timestamps de tablas que no los tienen en Supabase
          // para evitar error 400 Bad Request
          if (TABLES_WITHOUT_TIMESTAMPS.includes(tableName)) {
            delete rest.creado_at;
            delete rest.actualizado_at;
          }

          // SOLUCIÓN DEFINITIVA: Asignar valores por defecto para campos requeridos NULL
          // Esto maneja datos existentes en IndexedDB que no tienen tipo_medida
          if (tableName === 'movimientos_stock' && !rest.tipo_medida) {
            // Si no hay tipo_medida, intentar obtenerlo del medicamento
            // O usar UNIDAD como fallback seguro
            rest.tipo_medida = 'UNIDAD';
            console.warn('[useSimpleSync] Movimiento sin tipo_medida, asignando UNIDAD por defecto:', item.id);
          }

          return rest;
        });

        // No usar select() para evitar el parámetro columns automático que causa error 42804
        const { error } = await supabase.from(tableName).upsert(cleanData, { onConflict: 'id' });

        if (error) {
          console.error(`[useSimpleSync] Error sincronizando ${tableName}:`, error);
          continue;
        }

        // Marcar como sincronizado
        const ids = pending.map((p: any) => p.id);
        await table.bulkUpdate(ids.map((id: string) => ({ key: id, changes: { sync_status: 'synced' } })));
      }
    };

    syncPending();

    // Reintentar cuando vuelve la conexión
    const handleOnline = () => syncPending();
    window.addEventListener('online', handleOnline);

    return () => window.removeEventListener('online', handleOnline);
  }, [enabled]);
}
