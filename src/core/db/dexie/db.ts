import Dexie, { type EntityTable } from 'dexie';
import type { Perfil } from '@/features/usuarios/types';
import type { Paciente, ProgramaEstudio } from '@/features/pacientes/types';
import type { Medicamento, MovimientoStock } from '@/features/inventario/types';
import type { Atencion } from '@/features/atenciones/types';

const db = new Dexie('TopicoDatabase') as Dexie & {
  instituciones: EntityTable<{ id: string; nombre: string; activo: boolean; creado_at: string }, 'id'>;
  perfiles: EntityTable<Perfil, 'id'>;
  programas_estudio: EntityTable<ProgramaEstudio, 'id'>;
  pacientes: EntityTable<Paciente, 'id'>;
  medicamentos: EntityTable<Medicamento, 'id'>;
  atenciones: EntityTable<Atencion, 'id'>;
  movimientos_stock: EntityTable<MovimientoStock, 'id'>;
};

// v11: Agrega 'sync_status' a la tabla instituciones para evitar SchemaError en el SyncService
db.version(11).stores({
  instituciones:     'id, nombre, activo, creado_at, sync_status',
  perfiles:          'id, business_id, rol, email, sync_status, deleted_at, [business_id+activo]',
  programas_estudio: 'id, business_id, nombre, sync_status, deleted_at, [business_id+activo]',
  pacientes:         'id, business_id, dni, programa_id, sync_status, deleted_at, [business_id+activo]',
  medicamentos:      'id, business_id, nombre, activo, sync_status, deleted_at, [business_id+activo]',
  atenciones:        'id, business_id, paciente_id, perfil_id, fecha_atencion, creado_at, sync_status, deleted_at, [business_id+activo]',
  movimientos_stock: 'id, business_id, medicamento_id, atencion_id, tipo, fecha_movimiento, creado_at, sync_status, deleted_at',
}).upgrade(() => {});

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
