/**
 * Hook simple de sincronización - Reemplaza SyncService (197 líneas → 40 líneas)
 * Estrategia: "Local always wins, push when online"
 */
import { useEffect } from 'react';
import { db } from '@/core/db/dexie/db';
import { supabase } from '@/core/db/supabase/client';

// Orden de sincronización: medicamentos DEBE ir antes que movimientos_stock (foreign key)
// NOTA: programas_estudio está excluido de PUSH porque es datos de configuración (read-only desde cliente)
const TABLES = ['instituciones', 'perfiles', 'pacientes', 'medicamentos', 'atenciones', 'movimientos_stock'];

// Tablas en Supabase que NO tienen columnas creado_at/actualizado_at
// Estas columnas deben excluirse al sincronizar para evitar 400 Bad Request
// Después de la migración, todas las tablas tienen actualizado_at, así que esta lista está vacía
const TABLES_WITHOUT_TIMESTAMPS: string[] = [];

// Tablas que NO tienen business_id (instituciones.id IS the business_id)
const TABLES_WITHOUT_BUSINESS_ID = ['instituciones'];

/**
 * Migración de datos: Corrige registros existentes con tipo_medida NULL
 * Se ejecuta una sola vez al inicio para limpiar datos corruptos
 */
async function migrateNullTipoMedida() {
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

export function useSimpleSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !navigator.onLine) return;

    const syncPending = async () => {
      // Ejecutar migración antes de sincronizar (solo la primera vez)
      await migrateNullTipoMedida();

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

          // Convertir activo de 0/1 a boolean para Supabase
          if ('activo' in rest) {
            rest.activo = rest.activo === 1;
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
