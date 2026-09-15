import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/core/providers/AuthProvider';
import { Perfil } from '../types';
import { createUserAction, softDeleteUserAction, updateUserAction } from '../actions/users';
import { db } from '@/core/db';
import { isPerfilActivo } from '@/shared/utils/perfil';

// ───────────────────────────────────────────────────────────────────────────────
// GESTIÓN DE USUARIOS
// Creación/edición requiere internet; lectura offline vía Dexie
// ───────────────────────────────────────────────────────────────────────────────

export function useUsuarios() {
  const { businessId } = useAuth();

  const usuarios = useLiveQuery<Perfil[] | undefined>(
    async () => {
      const allPerfiles = await db.perfiles.toArray();

      if (!businessId) return [];

      const perfilesWithBusinessId = allPerfiles.filter((p: Perfil) => p.business_id === businessId);

      const filtered = perfilesWithBusinessId.filter((p: Perfil) => {
        const isNotDeleted = !p.deleted_at;
        return isPerfilActivo(p.activo) && isNotDeleted;
      });

      return filtered;
    }, [businessId]) ?? [];

  const isLoading = usuarios === undefined;

  const crearUsuario = async (
    usuario: Partial<Perfil> & { password?: string }
  ) => {
    if (!businessId) throw new Error('Business ID requerido');

    if (!navigator.onLine) {
      throw new Error('Se requiere conexión a internet para crear usuarios.');
    }

    const result = await createUserAction({ ...usuario, business_id: businessId });

    if (result.success && result.user) {
      await db.perfiles.put(result.user);
    }

    return result;
  };

  const actualizarUsuario = async (id: string, datos: Partial<Perfil>) => {
    if (!businessId) throw new Error('Business ID requerido');

    const now = new Date().toISOString();

    await db.perfiles.update(id, {
      ...datos,
      actualizado_at: now,
      sync_status: navigator.onLine ? 'synced' : 'pending',
    });

    if (navigator.onLine) {
      try {
        await updateUserAction(id, { ...datos, business_id: businessId });
      } catch (err: any) {
        console.warn('[useUsuarios] No se pudo actualizar en Supabase:', err.message);
      }
    }
  };

  const eliminarUsuario = async (id: string) => {
    if (!navigator.onLine) {
      throw new Error('Se requiere conexión a internet para eliminar usuarios.');
    }

    const now = new Date().toISOString();

    await db.perfiles.update(id, {
      activo: 0,
      deleted_at: now,
      actualizado_at: now,
      sync_status: 'synced',
    });

    await softDeleteUserAction(id);
  };

  return {
    usuarios,
    isLoading,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
  };
}
