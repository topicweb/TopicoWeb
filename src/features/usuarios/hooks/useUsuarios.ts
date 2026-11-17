import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/core/providers/AuthProvider';
import { CreateUserData, Perfil } from '../types';
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

  const crearUsuario = async (usuario: CreateUserData) => {
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
    if (!navigator.onLine) throw new Error('Se requiere conexión a internet para editar usuarios.');

    const result = await updateUserAction(id, { ...datos, business_id: businessId });
    await db.perfiles.put(result.user);
    return result;
  };

  const eliminarUsuario = async (id: string) => {
    if (!navigator.onLine) {
      throw new Error('Se requiere conexión a internet para eliminar usuarios.');
    }

    const result = await softDeleteUserAction(id);
    await db.perfiles.put(result.user);
  };

  return {
    usuarios,
    isLoading,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
  };
}
