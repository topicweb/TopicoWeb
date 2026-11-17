// ───────────────────────────────────────────────────────────────────────────────
// CORE DATABASE - DEXIE
// Configuración principal de IndexedDB para la aplicación Tópico
// ───────────────────────────────────────────────────────────────────────────────

import Dexie, { type EntityTable } from 'dexie';
import type { Perfil } from '@/features/usuarios/types';
import type { Paciente, ProgramaEstudio } from '@/features/pacientes/types';
import type { Medicamento, MovimientoStock } from '@/features/inventario/types';
import type { Atencion } from '@/features/atenciones/types';
import { generateUUID as generateUUIDUtil } from '@/shared/utils/uuid';

// ───────────────────────────────────────────────────────────────────────────────
// DATABASE INSTANCE
// ───────────────────────────────────────────────────────────────────────────────

export type TopicoDatabase = Dexie & {
  instituciones: EntityTable<{ id: string; nombre: string; activo: number; creado_at: string }, 'id'>;
  perfiles: EntityTable<Perfil, 'id'>;
  programas_estudio: EntityTable<ProgramaEstudio, 'id'>;
  pacientes: EntityTable<Paciente, 'id'>;
  medicamentos: EntityTable<Medicamento, 'id'>;
  atenciones: EntityTable<Atencion, 'id'>;
  movimientos_stock: EntityTable<MovimientoStock, 'id'>;
  sync_table_metadata: EntityTable<{ id: string; deviceId: string; businessId: string; userId: string; table: string; lastSync?: string; error?: string }, 'id'>;
  sync_context_metadata: EntityTable<{ id: string; deviceId: string; businessId: string; userId: string; lastSync: string }, 'id'>;
  sync_metadata: EntityTable<{ deviceId: string; businessId: string; lastSync: string }, 'deviceId'>;
};

export function createTopicoDatabase(name: string): TopicoDatabase {
const db = new Dexie(name) as TopicoDatabase;

// ───────────────────────────────────────────────────────────────────────────────
// DATABASE VERSION & MIGRATIONS
// ───────────────────────────────────────────────────────────────────────────────

// v11: Agrega 'sync_status' a la tabla instituciones
// v12: Migración masiva de activo: boolean -> activo: number (0/1) para evitar DataError
// v13: Índice compuesto para optimizar "Atenciones Hoy"
// v14: FASE 4.2 - Índices optimizados para stock y tipo_medida
// v15: Índice [business_id+tipo+fecha_movimiento] para consultas de stock por vencer en dashboard
// v16: SOLUCIÓN DEFINITIVA - Migración para corregir tipo_medida NULL en movimientos_stock existentes
// v17: Agrega tabla sync_metadata para sincronización incremental (device tracking)
// v18: Sistema de vencimiento - Agrega fecha_vencimiento a movimientos_stock y corrige lógica de "stock por vencer"
// v19: Corrección de índice duplicado fecha_vencimiento en movimientos_stock
// v20: diagnostico en atenciones + FR/FC en signos_vitales (payload JSON, sin índice extra)
// NOTA: Migraciones eliminadas para despliegue limpio - estructura se crea desde cero

const SCHEMA_V1 = {
  instituciones: 'id, nombre, activo, creado_at, sync_status',
  perfiles: 'id, business_id, rol, email, sync_status, deleted_at, [business_id+activo]',
  programas_estudio: 'id, business_id, nombre, sync_status, deleted_at, [business_id+activo]',
  pacientes: 'id, business_id, dni, programa_id, fecha_nacimiento, telefono, sync_status, deleted_at, [business_id+activo]',
  medicamentos: 'id, business_id, nombre, activo, tipo_medida, stock_actual, sync_status, deleted_at, [business_id+activo], [business_id+tipo_medida], [business_id+stock_actual]',
  atenciones: 'id, business_id, paciente_id, perfil_id, fecha_atencion, creado_at, sync_status, deleted_at, [business_id+activo], [business_id+fecha_atencion]',
  movimientos_stock: 'id, business_id, medicamento_id, atencion_id, tipo, tipo_medida, fecha_movimiento, fecha_vencimiento, creado_at, sync_status, deleted_at, [business_id+medicamento_id], [business_id+atencion_id], [medicamento_id+fecha_movimiento], [business_id+tipo+fecha_movimiento], [business_id+fecha_vencimiento]',
  sync_metadata: 'deviceId, businessId, lastSync, [deviceId+businessId]',
};

db.version(1).stores(SCHEMA_V1);

db.version(2).stores(SCHEMA_V1).upgrade(async (tx) => {
  await tx.table('atenciones').toCollection().modify((atencion) => {
    if (atencion.diagnostico === undefined) {
      atencion.diagnostico = '';
    }
    const sv = atencion.signos_vitales ?? {};
    atencion.signos_vitales = {
      temp: sv.temp ?? '',
      presion: sv.presion ?? '',
      saturacion: sv.saturacion ?? '',
      fr: sv.fr ?? '',
      fc: sv.fc ?? '',
    };
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ───────────────────────────────────────────────────────────────────────────────



// Re-exportar utilidades para backward compatibility


db.version(3).stores({ ...SCHEMA_V1, sync_context_metadata: 'id, [deviceId+businessId+userId]' });

// Conservar cursores previos; reconstruir cada tabla sin reutilizar el cursor global.
db.version(4).stores({ sync_table_metadata: 'id, [deviceId+businessId+userId], businessId' });

return db;
}

export { generateUUIDUtil as generateUUID };

let activeCache: TopicoDatabase | null = null;
let selectedAccount: string | null = null;
export const accountCacheName = (userId: string) => {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(userId)) throw new Error('Invalid cache identity');
  return `TopicoDatabase:account:${userId.toLowerCase()}`;
};

/** One identity per document lifetime: reload on account changes, never swap
 * a live database underneath outstanding clinical operations. */
export async function openAccountCache(userId: string): Promise<void> {
  const name = accountCacheName(userId);
  if (selectedAccount && selectedAccount !== userId) throw new Error('Account change requires reload');
  selectedAccount = userId;
  activeCache ??= createTopicoDatabase(name);
  await activeCache.open();
}

export function lockAccountCache(): void {
  activeCache?.close({ disableAutoOpen: true });
  activeCache = null;
}

export function isAccountCacheOpen(userId: string): boolean {
  return selectedAccount === userId && !!activeCache?.isOpen();
}

// Importers keep a stable facade, but cannot read a cache before Auth selects it.
// Old table handles are closed at logout and never point to another account.
export const db = new Proxy({} as TopicoDatabase, {
  get(_target, property) {
    if (!activeCache) throw new Error('Account cache is locked');
    const value = Reflect.get(activeCache, property, activeCache);
    return typeof value === 'function' ? value.bind(activeCache) : value;
  },
});
