import Dexie, { type EntityTable } from 'dexie';
import type { Perfil } from '@/features/usuarios/types';
import type { Paciente, ProgramaEstudio } from '@/features/pacientes/types';
import type { Medicamento, MovimientoStock } from '@/features/inventario/types';
import type { Atencion } from '@/features/atenciones/types';
import type { RegistroAuditoria } from '@/shared/utils/audit';

const db = new Dexie('TopicoDatabase') as Dexie & {
  instituciones: EntityTable<{ id: string; nombre: string; activo: number; creado_at: string }, 'id'>;
  perfiles: EntityTable<Perfil, 'id'>;
  programas_estudio: EntityTable<ProgramaEstudio, 'id'>;
  pacientes: EntityTable<Paciente, 'id'>;
  medicamentos: EntityTable<Medicamento, 'id'>;
  atenciones: EntityTable<Atencion, 'id'>;
  movimientos_stock: EntityTable<MovimientoStock, 'id'>;
  security_audit_log: EntityTable<RegistroAuditoria, 'id'>;
  sync_metadata: EntityTable<{ deviceId: string; businessId: string; lastSync: string }, 'deviceId'>;
};

// v11: Agrega 'sync_status' a la tabla instituciones
// v12: Migración masiva de activo: boolean -> activo: number (0/1) para evitar DataError
// v13: Índice compuesto para optimizar "Atenciones Hoy"
// v14: FASE 4.2 - Índices optimizados para stock y tipo_medida
// v15: Índice [business_id+tipo+fecha_movimiento] para consultas de stock por vencer en dashboard
// v16: SOLUCIÓN DEFINITIVA - Migración para corregir tipo_medida NULL en movimientos_stock existentes
// v17: Agrega tabla sync_metadata para sincronización incremental (device tracking)

db.version(17).stores({
  instituciones: 'id, nombre, activo, creado_at, sync_status',
  perfiles: 'id, business_id, rol, email, sync_status, deleted_at, [business_id+activo]',
  programas_estudio: 'id, business_id, nombre, sync_status, deleted_at, [business_id+activo]',
  pacientes: 'id, business_id, dni, programa_id, sync_status, deleted_at, [business_id+activo]',
  // FASE 4.2: Índices para consultas de stock por tipo y stock bajo
  medicamentos: 'id, business_id, nombre, activo, tipo_medida, stock_actual, sync_status, deleted_at, [business_id+activo], [business_id+tipo_medida], [business_id+stock_actual]',
  atenciones: 'id, business_id, paciente_id, perfil_id, fecha_atencion, creado_at, sync_status, deleted_at, [business_id+activo], [business_id+fecha_atencion]',
  // v15: Agregado índice [business_id+tipo+fecha_movimiento] para dashboard "stock por vencer"
  movimientos_stock: 'id, business_id, medicamento_id, atencion_id, tipo, tipo_medida, fecha_movimiento, creado_at, sync_status, deleted_at, [business_id+medicamento_id], [business_id+atencion_id], [medicamento_id+fecha_movimiento], [business_id+tipo+fecha_movimiento]',
  // FASE 4.3: Tabla de auditoría de seguridad
  security_audit_log: 'id, user_id, business_id, tipo, medicamento_id, atencion_id, timestamp, sync_status, [business_id+tipo], [business_id+timestamp]',
  // v17: Tabla para rastrear dispositivos y última sincronización
  sync_metadata: 'deviceId, businessId, lastSync, [deviceId+businessId]',
}).upgrade(async (tx) => {
  // v16: Migración definitiva para corregir tipo_medida NULL en movimientos_stock
  console.log('[DB v16] Iniciando migración para corregir tipo_medida NULL...');

  const movements = await tx.table('movimientos_stock').toArray();
  let correctedCount = 0;

  for (const movement of movements) {
    if (!movement.tipo_medida) {
      // Obtener tipo_medida del medicamento o usar UNIDAD como fallback
      const medicamento = await tx.table('medicamentos').get(movement.medicamento_id);
      const tipoMedida = medicamento?.tipo_medida || 'UNIDAD';

      await tx.table('movimientos_stock').update(movement.id, {
        tipo_medida: tipoMedida,
        sync_status: 'pending', // Forzar re-sincronización
      });

      correctedCount++;
    }
  }

  console.log(`[DB v16] Migración completada: ${correctedCount} movimientos corregidos`);
}).upgrade(async (tx) => {
  // v17: Crear tabla sync_metadata para sincronización incremental
  console.log('[DB v17] Creando tabla sync_metadata para sincronización incremental...');
  // La tabla se crea automáticamente con la definición de stores
  console.log('[DB v17] Tabla sync_metadata creada exitosamente');
});

export { db };

/**
 * Función para limpiar completamente IndexedDB y empezar desde cero
 * Úsala con precaución: borra TODOS los datos locales
 */
export async function clearDatabase() {
  console.log('[DB] Limpiando base de datos local...');
  await db.delete();
  console.log('[DB] Base de datos local eliminada. Recarga la página para empezar desde cero.');
  window.location.reload();
}

// Función auxiliar para generar UUIDs localmente (necesaria para offline)
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback simple
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
