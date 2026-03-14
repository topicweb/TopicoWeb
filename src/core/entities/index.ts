/**
 * @module core/entities
 *
 * Barrel de compatibilidad: re-exporta todos los tipos públicos de cada feature.
 * Permite importar desde '@/core/entities' sin necesidad de conocer la ruta exacta del feature.
 *
 * Norma: El camino CANÓNICO es '@/features/<feature>/types'.
 *        Este barrel es un ALIAS de conveniencia — no agregar lógica aquí.
 */

// ── Core ───────────────────────────────────────────────────────────────────
export type { BaseEntity, SyncStatus } from '@/core/db/dexie/types';

// ── Usuarios / Perfiles ────────────────────────────────────────────────────
export type { Perfil, RolUsuario, PerfilFormData } from '@/features/usuarios/types';

// ── Pacientes ──────────────────────────────────────────────────────────────
export type {
  Paciente,
  ProgramaEstudio,
  CategoriaPaciente,
  PacienteFormData,
} from '@/features/pacientes/types';

// ── Atenciones ─────────────────────────────────────────────────────────────
export type {
  Atencion,
  AtencionFormData,
  SignosVitales,
} from '@/features/atenciones/types';

// ── Inventario ─────────────────────────────────────────────────────────────
export type {
  Medicamento,
  MovimientoStock,
  TipoMovimiento,
  MedicamentoFormData,
  MovimientoFormData,
} from '@/features/inventario/types';
