import type { CategoriaPaciente, ProgramaEstudio } from '../types';

// ───────────────────────────────────────────────────────────────────────────────
// CONSTANTES DEL MÓDULO PACIENTES
// Programas académicos, categorías y configuraciones por defecto
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// Programas académicos
// NOTA: Los programas se obtienen dinámicamente de Supabase/Dexie, no están hardcodeados
// ───────────────────────────────────────────────────────────────────────────────
export const PROGRAMAS_FIJOS: ProgramaEstudio[] = [];

// ───────────────────────────────────────────────────────────────────────────────
// Categorías de pacientes disponibles
// ───────────────────────────────────────────────────────────────────────────────
export const CATEGORIAS: { value: CategoriaPaciente; label: string }[] = [
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'docente', label: 'Docente' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'limpieza', label: 'Limpieza' },
];

// ───────────────────────────────────────────────────────────────────────────────
// Ciclos académicos disponibles
// ───────────────────────────────────────────────────────────────────────────────
export const CICLOS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;

// ───────────────────────────────────────────────────────────────────────────────
// Turnos disponibles
// ───────────────────────────────────────────────────────────────────────────────
export const TURNOS = ['Mañana', 'Tarde', 'Noche'] as const;

// ───────────────────────────────────────────────────────────────────────────────
// Estado inicial del formulario de pacientes
// ───────────────────────────────────────────────────────────────────────────────
export const DEFAULT_FORM = {
  dni: '',
  nombres: '',
  apellidos: '',
  categoria: 'estudiante' as CategoriaPaciente,
  programa_id: '',
  sexo: 'M' as 'M' | 'F',
  fecha_nacimiento: null,
  telefono: null,
  metadata: { turno: 'Mañana' },
};
