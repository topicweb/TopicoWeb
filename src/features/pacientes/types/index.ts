/**
 * @module features/pacientes/types
 *
 * Tipos del módulo Pacientes.
 * BaseEntity y SyncStatus se importan desde el núcleo — NO redefinir aquí.
 */
import { BaseEntity } from '@/core/db/dexie/types';

// ── Enumeraciones ──────────────────────────────────────────────────────────

export type CategoriaPaciente =
  | 'estudiante'
  | 'docente'
  | 'administrativo'
  | 'limpieza';

// ── Entidades ──────────────────────────────────────────────────────────────

/**
 * Programa de estudio (FK en pacientes.programa_id).
 * Entidad auxiliar — sin CRUD completo propio, se gestiona desde el módulo pacientes.
 */
export interface ProgramaEstudio extends BaseEntity {
  /** Multi-tenancy: institución a la que pertenece el programa */
  business_id?: string;
  nombre: string;
  activo: number; // 0 | 1 para indexación en IndexedDB
}

/**
 * Paciente — mapea 1:1 con `public.pacientes` en Supabase.
 *
 * Campos gestionados automáticamente por `useDexieCrud`:
 *   id, business_id, creado_at, activo, actualizado_at, sync_status
 *
 * `metadata`: JSONB flexible para datos adicionales según categoría, p.ej:
 *   - estudiante → { ciclo, anio_ingreso, turno }
 *   - docente    → { departamento, cargo }
 */
export interface Paciente extends BaseEntity {
  /** Multi-tenancy: FK a public.instituciones */
  business_id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  sexo: 'M' | 'F';
  categoria: CategoriaPaciente;
  /** FK a public.programas_estudio (solo aplica a estudiantes) */
  programa_id?: string | null;
  /**
   * JSONB flexible para atributos adicionales sin crear columnas extra.
   * Ejemplos: { ciclo: "IV", anio_ingreso: 2022, turno: "Mañana" }
   */
  metadata: Record<string, unknown>;
  creado_at: string;
  activo: number; // 0 | 1 para indexación
}

// ── DTOs / Form types ──────────────────────────────────────────────────────

/**
 * Tipo para el formulario de creación/edición de pacientes.
 * Excluye todos los campos gestionados internamente por `useDexieCrud`.
 */
export type PacienteFormData = Omit<
  Paciente,
  'id' | 'business_id' | 'creado_at' | 'activo' | 'sync_status' | 'actualizado_at' | 'deleted_at'
>;
