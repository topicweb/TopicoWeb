/**
 * @module features/usuarios/types
 *
 * Tipos del módulo Usuarios/Perfiles.
 * BaseEntity y SyncStatus se importan desde el núcleo — NO redefinir aquí.
 */
import { BaseEntity } from '@/core/db/dexie/types';

// ── Enumeraciones ──────────────────────────────────────────────────────────

/** Roles disponibles en el sistema. Mapea con el tipo SQL `rol_usuario`. */
export type RolUsuario = 'admin' | 'personal';

// Re-exportar desde core para que importadores de '@/features/usuarios/types'
// aún puedan obtener BaseEntity y SyncStatus sin cambiar sus imports.
export type { BaseEntity, SyncStatus } from '@/core/db/dexie/types';

// ── Entidades ──────────────────────────────────────────────────────────────

/**
 * Perfil del personal de salud — mapea 1:1 con `public.perfiles` en Supabase.
 *
 * Campos gestionados automáticamente por `useDexieCrud`:
 *   id, business_id, creado_at, activo, actualizado_at, sync_status
 */
export interface Perfil extends BaseEntity {
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: number; // 0 | 1 para indexación
  /**
   * FK a public.instituciones.
   * Clave para el filtrado multi-tenant — nunca puede ser null en producción.
   */
  business_id: string | null;
}

// ── DTOs / Form types ──────────────────────────────────────────────────────

/**
 * Tipo para el formulario de creación/edición de usuarios.
 * Excluye todos los campos gestionados internamente por `useDexieCrud`.
 */
export type PerfilFormData = Omit<
  Perfil,
  'id' | 'business_id' | 'creado_at' | 'activo' | 'sync_status' | 'actualizado_at' | 'deleted_at'
>;
