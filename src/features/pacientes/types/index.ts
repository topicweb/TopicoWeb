// ───────────────────────────────────────────────────────────────────────────────
// TIPOS DEL MÓDULO PACIENTES
// Define estructuras de datos para gestión de pacientes y programas de estudio
// ───────────────────────────────────────────────────────────────────────────────

import { BaseEntity } from '@/core/db/dexie/types';

// ───────────────────────────────────────────────────────────────────────────────
// Categorías de pacientes disponibles
// ───────────────────────────────────────────────────────────────────────────────
export type CategoriaPaciente = 'estudiante' | 'docente' | 'administrativo' | 'limpieza';

// ───────────────────────────────────────────────────────────────────────────────
// Programa de estudio académico
// ───────────────────────────────────────────────────────────────────────────────
export interface ProgramaEstudio extends BaseEntity {
  business_id?: string;
  nombre: string;
  activo: number;
}

// ───────────────────────────────────────────────────────────────────────────────
// Paciente del servicio médico
// ───────────────────────────────────────────────────────────────────────────────
export interface Paciente extends BaseEntity {
  business_id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  sexo: 'M' | 'F';
  categoria: CategoriaPaciente;
  programa_id?: string | null;
  metadata: Record<string, unknown>;
  creado_at: string;
  activo: number;
}

// ───────────────────────────────────────────────────────────────────────────────
// Tipo para el formulario de creación/edición de pacientes
// ───────────────────────────────────────────────────────────────────────────────
export type PacienteFormData = Omit<
  Paciente,
  'id' | 'business_id' | 'creado_at' | 'activo' | 'sync_status' | 'actualizado_at' | 'deleted_at'
>;
