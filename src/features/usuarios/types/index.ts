// ───────────────────────────────────────────────────────────────────────────────
// TIPOS DEL MÓDULO USUARIOS/PERFILES
// Define estructuras de datos para gestión de personal médico
// ───────────────────────────────────────────────────────────────────────────────

import { BaseEntity } from '@/core/db/dexie/types';

export type { BaseEntity, SyncStatus } from '@/core/db/dexie/types';

// ───────────────────────────────────────────────────────────────────────────────
// Roles disponibles en el sistema
// ───────────────────────────────────────────────────────────────────────────────
export type RolUsuario = 'admin' | 'personal';

// ───────────────────────────────────────────────────────────────────────────────
// Perfil del personal de salud
// Mapea 1:1 con `public.perfiles` en Supabase
// ───────────────────────────────────────────────────────────────────────────────
export interface Perfil extends BaseEntity {
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: number;
  business_id: string | null;
}

// ───────────────────────────────────────────────────────────────────────────────
// Tipo para el formulario de creación/edición de usuarios
// ───────────────────────────────────────────────────────────────────────────────
export type PerfilFormData = Omit<
  Perfil,
  'id' | 'business_id' | 'creado_at' | 'activo' | 'sync_status' | 'actualizado_at' | 'deleted_at'
>;
