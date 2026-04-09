/**
 * @module features/atenciones/types
 *
 * Tipos del módulo Atenciones (Consultas Médicas).
 * Alineados con el esquema SQL real de Supabase.
 * BaseEntity y SyncStatus se importan desde el núcleo — NO redefinir aquí.
 */
import { BaseEntity } from '@/core/db/dexie/types';
import type { DispensacionMedicamento as DispensacionMedicamentoType } from '@/features/inventario/types';

// Re-exportar desde core para compatibilidad con importadores existentes.
export type { BaseEntity, SyncStatus } from '@/core/db/dexie/types';

// ── Entidades ──────────────────────────────────────────────────────────────

/**
 * Signos vitales — almacenados como JSONB en Supabase.
 * Tipos simples para máxima flexibilidad (strings vacíos = no registrado).
 */
export interface SignosVitales {
  temp: string;        // Temperatura corporal en °C
  presion: string;     // Presión arterial, ej: "120/80"
  saturacion: string;  // Saturación de oxígeno en %
}

/**
 * Atencion — mapea 1:1 con `public.atenciones` en Supabase.
 *
 * Campos gestionados automáticamente por `useDexieCrud`:
 *   id, business_id, creado_at, activo, actualizado_at, sync_status
 */
export interface Atencion extends BaseEntity {
  /** Multi-tenancy: FK a public.instituciones */
  business_id: string;
  /** FK a public.pacientes */
  paciente_id: string;
  /** FK a public.perfiles (personal de salud que registra la atención) */
  perfil_id: string;
  motivo_consulta: string;
  /**
   * Signos vitales — JSONB en Supabase.
   * Strings vacíos indican "no registrado" para ese campo.
   */
  signos_vitales: SignosVitales;
  observacion?: string;
  activo: number; // 0 | 1 para indexación
  fecha_atencion: string; // ISO string
}

// ── DTOs / Form types ──────────────────────────────────────────────────────

/**
 * Tipo para el formulario de registro de atención.
 * Excluye campos gestionados por `useDexieCrud` + `perfil_id` (se inyecta desde AuthContext).
 */
export type AtencionFormData = Omit<
  Atencion,
  | 'id'
  | 'business_id'
  | 'perfil_id'
  | 'activo'
  | 'creado_at'
  | 'sync_status'
  | 'actualizado_at'
  | 'deleted_at'
>;

// ── Tipos de Dispensación Múltiple (Nuevos) ─────────────────────────────────────

/**
 * Atención extendida con lista de dispensaciones múltiples.
 * Usada para el registro de atenciones con varios medicamentos.
 */
export interface AtencionExtendida extends Atencion {
  /** Lista de medicamentos dispensados en esta atención */
  dispensaciones: DispensacionMedicamento[];
}

/**
 * Dispensación de medicamento en una atención.
 * Re-exportado desde inventario para mantener consistencia.
 */
export type DispensacionMedicamento = DispensacionMedicamentoType;

/**
 * Resultado de una atención con movimientos consolidados.
 * Representa el estado final después de agrupar dispensaciones.
 */
export interface AtencionProcesada {
  /** Datos básicos de la atención */
  atencion: Atencion;
  /** Movimientos de stock consolidados generados */
  movimientos_generados: {
    medicamento_id: string;
    medicamento_nombre: string;
    cantidad_total: number;
    tipo_medida: string;
    descripcion_movimiento: string;
  }[];
}

/**
 * Configuración para la agrupación de movimientos.
 * Define cómo se combinan las dispensaciones en movimientos consolidados.
 */
export interface ConfiguracionAgrupacion {
  /** Agrupar por medicamento (default) */
  por_medicamento: boolean;
  /** Agrupar por tipo de medida */
  por_tipo_medida: boolean;
  /** Generar descripciones automáticas */
  generar_descripciones: boolean;
}
