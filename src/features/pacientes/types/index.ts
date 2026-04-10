import { BaseEntity } from '@/core/db/dexie/types';

export type CategoriaPaciente = 'estudiante' | 'docente' | 'administrativo' | 'limpieza';

export interface ProgramaEstudio extends BaseEntity {
  business_id?: string;
  nombre: string;
  activo: number;
}

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

export type PacienteFormData = Omit<
  Paciente,
  'id' | 'business_id' | 'creado_at' | 'activo' | 'sync_status' | 'actualizado_at' | 'deleted_at'
>;
