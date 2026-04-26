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

const db = new Dexie('TopicoDatabase') as Dexie & {
  instituciones: EntityTable<{ id: string; nombre: string; activo: number; creado_at: string }, 'id'>;
  perfiles: EntityTable<Perfil, 'id'>;
  programas_estudio: EntityTable<ProgramaEstudio, 'id'>;
  pacientes: EntityTable<Paciente, 'id'>;
  medicamentos: EntityTable<Medicamento, 'id'>;
  atenciones: EntityTable<Atencion, 'id'>;
  movimientos_stock: EntityTable<MovimientoStock, 'id'>;
  sync_metadata: EntityTable<{ deviceId: string; businessId: string; lastSync: string }, 'deviceId'>;
};

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
// NOTA: Migraciones eliminadas para despliegue limpio - estructura se crea desde cero

db.version(1).stores({
  instituciones: 'id, nombre, activo, creado_at, sync_status',
  perfiles: 'id, business_id, rol, email, sync_status, deleted_at, [business_id+activo]',
  programas_estudio: 'id, business_id, nombre, sync_status, deleted_at, [business_id+activo]',
  pacientes: 'id, business_id, dni, programa_id, sync_status, deleted_at, [business_id+activo]',
  // FASE 4.2: Índices para consultas de stock por tipo y stock bajo
  medicamentos: 'id, business_id, nombre, activo, tipo_medida, stock_actual, sync_status, deleted_at, [business_id+activo], [business_id+tipo_medida], [business_id+stock_actual]',
  atenciones: 'id, business_id, paciente_id, perfil_id, fecha_atencion, creado_at, sync_status, deleted_at, [business_id+activo], [business_id+fecha_atencion]',
  // v15: Agregado índice [business_id+tipo+fecha_movimiento] para dashboard "stock por vencer"
  // v18: Agregado índices para fecha_vencimiento en sistema de vencimiento
  movimientos_stock: 'id, business_id, medicamento_id, atencion_id, tipo, tipo_medida, fecha_movimiento, fecha_vencimiento, creado_at, sync_status, deleted_at, [business_id+medicamento_id], [business_id+atencion_id], [medicamento_id+fecha_movimiento], [business_id+tipo+fecha_movimiento], [business_id+fecha_vencimiento]',
  // v17: Tabla para rastrear dispositivos y última sincronización
  sync_metadata: 'deviceId, businessId, lastSync, [deviceId+businessId]',
});

// ───────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ───────────────────────────────────────────────────────────────────────────────

export { db };

// Re-exportar utilidades para backward compatibility
export { generateUUIDUtil as generateUUID };
