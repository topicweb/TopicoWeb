import Dexie, { type EntityTable } from 'dexie';
import type { Perfil } from '@/features/usuarios/types';
import type { Paciente, ProgramaEstudio } from '@/features/pacientes/types';
import type { Medicamento, MovimientoStock } from '@/features/inventario/types';
import type { Atencion } from '@/features/atenciones/types';

const db = new Dexie('TopicoDatabase') as Dexie & {
  instituciones: EntityTable<{ id: string; nombre: string; activo: number; creado_at: string }, 'id'>;
  perfiles: EntityTable<Perfil, 'id'>;
  programas_estudio: EntityTable<ProgramaEstudio, 'id'>;
  pacientes: EntityTable<Paciente, 'id'>;
  medicamentos: EntityTable<Medicamento, 'id'>;
  atenciones: EntityTable<Atencion, 'id'>;
  movimientos_stock: EntityTable<MovimientoStock, 'id'>;
};

// v11: Agrega 'sync_status' a la tabla instituciones
// v12: Migración masiva de activo: boolean -> activo: number (0/1) para evitar DataError
// v13: Índice compuesto para optimizar "Atenciones Hoy"
// v14: FASE 4.2 - Índices optimizados para stock y tipo_medida

db.version(14).stores({
  instituciones: 'id, nombre, activo, creado_at, sync_status',
  perfiles: 'id, business_id, rol, email, sync_status, deleted_at, [business_id+activo]',
  programas_estudio: 'id, business_id, nombre, sync_status, deleted_at, [business_id+activo]',
  pacientes: 'id, business_id, dni, programa_id, sync_status, deleted_at, [business_id+activo]',
  // FASE 4.2: Índices para consultas de stock por tipo y stock bajo
  medicamentos: 'id, business_id, nombre, activo, tipo_medida, stock_actual, sync_status, deleted_at, [business_id+activo], [business_id+tipo_medida], [business_id+stock_actual]',
  atenciones: 'id, business_id, paciente_id, perfil_id, fecha_atencion, creado_at, sync_status, deleted_at, [business_id+activo], [business_id+fecha_atencion]',
  // FASE 4.2: Índices para movimientos por medicamento y tipo (para lazy loading)
  movimientos_stock: 'id, business_id, medicamento_id, atencion_id, tipo, tipo_medida, fecha_movimiento, creado_at, sync_status, deleted_at, [business_id+medicamento_id], [business_id+atencion_id], [medicamento_id+fecha_movimiento]',
}).upgrade(async (tx) => {
  const tablesToMigrate = [
    'instituciones',
    'perfiles',
    'programas_estudio',
    'pacientes',
    'medicamentos',
    'atenciones'
  ];

  for (const tableName of tablesToMigrate) {
    const table = tx.table(tableName);
    await table.toCollection().modify(item => {
      if (typeof item.activo === 'boolean') {
        item.activo = item.activo ? 1 : 0;
      }
    });
  }
});

export { db };

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
