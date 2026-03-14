/**
 * @module features/atenciones/types
 *
 * Tipos del módulo Atenciones (Consultas Médicas).
 * Alineados con el esquema SQL real de Supabase.
 * BaseEntity y SyncStatus se importan desde el núcleo — NO redefinir aquí.
 */
import { BaseEntity } from '@/core/db/dexie/types';

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
  activo: boolean;
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
