/**
 * Hook del módulo Usuarios - CRUD híbrido (Server Actions + Dexie).
 */
import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/core/providers/AuthProvider';
import { Perfil } from '../types';
import { createUserAction, softDeleteUserAction, updateUserAction } from '../actions/users';
import { db } from '@/core/db';

export function useUsuarios() {
  const { businessId } = useAuth();

  // Query reactiva filtrada por tenant
  const usuarios = useLiveQuery<Perfil[] | undefined>(
    async () => {
      const allPerfiles = await db.perfiles.toArray();

      if (!businessId) return [];

      const perfilesWithBusinessId = allPerfiles.filter((p: Perfil) => p.business_id === businessId);

      const filtered = perfilesWithBusinessId.filter((p: Perfil) => {
        // Manejar tanto boolean (Supabase) como number (Dexie) para activo
        const isActive = (p.activo as any) === 1 || (p.activo as any) === true;
        const isNotDeleted = !p.deleted_at;
        return isActive && isNotDeleted;
      });

      return filtered;
    }, [businessId]) ?? [];

  const isLoading = usuarios === undefined;

  // ── 2. Operaciones ─────────────────────────────────────────────────────

  /**
   * Crea un usuario en Supabase Auth + registra su perfil en Dexie.
   * REQUIERE conexión a internet (Auth no funciona offline).
   */
  const crearUsuario = async (
    usuario: Partial<Perfil> & { password?: string }
  ) => {
    if (!navigator.onLine) {
      throw new Error('Se requiere conexión a internet para crear nuevos usuarios.');
    }
    if (!businessId) throw new Error('Business ID no encontrado');

    const result = await createUserAction({ ...usuario, business_id: businessId });

    if (result.success && result.user) {
      await db.perfiles.put(result.user);
    }

    return result;
  };

  /**
   * Actualiza un perfil de usuario.
   * - Online: Server Action → luego marca local como 'synced'.
   * - Offline: Guarda local como 'pending' → se sincronizará al recuperar red.
   */
  const actualizarUsuario = async (id: string, datos: Partial<Perfil>) => {
    if (navigator.onLine) {
      await updateUserAction(id, datos);
      await db.perfiles.update(id, {
        ...datos,
        actualizado_at: new Date().toISOString(),
        sync_status: 'synced',
      });
    } else {
      await db.perfiles.update(id, {
        ...datos,
        actualizado_at: new Date().toISOString(),
        sync_status: 'pending',
      });
    }
  };

  /**
   * Soft-delete de usuario: marca como inactivo en Dexie y en Supabase.
   * Si está offline, useSimpleSync propagará el delete al recuperar red.
   */
  const eliminarUsuario = async (id: string) => {
    const now = new Date().toISOString();

    await db.perfiles.update(id, {
      activo: 0,
      deleted_at: now,
      actualizado_at: now,
      sync_status: 'pending',
    });

    if (navigator.onLine) {
      try {
        await softDeleteUserAction(id);
        await db.perfiles.update(id, { sync_status: 'synced' });
      } catch (error) {
        console.error('Error propagando soft-delete al servidor:', error);
      }
    }
  };

  return {
    usuarios,
    isLoading,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
  };
}
