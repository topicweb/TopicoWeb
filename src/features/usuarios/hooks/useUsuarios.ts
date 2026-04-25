import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/core/providers/AuthProvider';
import { Perfil } from '../types';
import { createUserAction, softDeleteUserAction, updateUserAction } from '../actions/users';
import { db } from '@/core/db';

// ───────────────────────────────────────────────────────────────────────────────
// GESTIÓN DE USUARIOS
// CRUD híbrido: Server Actions + Dexie (offline-first)
// ───────────────────────────────────────────────────────────────────────────────

export function useUsuarios() {
  const { businessId } = useAuth();

  // Query reactiva: usuarios activos del tenant actual
  const usuarios = useLiveQuery<Perfil[] | undefined>(
    async () => {
      const allPerfiles = await db.perfiles.toArray();

      if (!businessId) return [];

      // Filtrar por tenant
      const perfilesWithBusinessId = allPerfiles.filter((p: Perfil) => p.business_id === businessId);

      // Solo activos y no eliminados
      const filtered = perfilesWithBusinessId.filter((p: Perfil) => {
        // Compatible con boolean (Supabase) y number (Dexie)
        const isActive = (p.activo as any) === 1 || (p.activo as any) === true;
        const isNotDeleted = !p.deleted_at;
        return isActive && isNotDeleted;
      });

      return filtered;
    }, [businessId]) ?? [];

  const isLoading = usuarios === undefined;

  // ── OPERACIONES CRUD ─────────────────────────────────────────────────────────

  const crearUsuario = async (
    usuario: Partial<Perfil> & { password?: string }
  ) => {
    // Auth requiere conexión obligatoria
    if (!navigator.onLine) {
      throw new Error('Se requiere conexión para crear usuarios');
    }
    if (!businessId) throw new Error('Business ID requerido');

    // Crear en Supabase Auth + perfil local
    const result = await createUserAction({ ...usuario, business_id: businessId });

    if (result.success && result.user) {
      await db.perfiles.put(result.user);
    }

    return result;
  };

  const actualizarUsuario = async (id: string, datos: Partial<Perfil>) => {
    // Actualización directa via Server Action
    if (!navigator.onLine) {
      throw new Error('Se requiere conexión para actualizar');
    }

    await updateUserAction(id, datos);
    await db.perfiles.update(id, {
      ...datos,
      actualizado_at: new Date().toISOString(),
      sync_status: 'synced',
    });
  };

  const eliminarUsuario = async (id: string) => {
    // Soft-delete: mantiene datos pero marca inactivo
    if (!navigator.onLine) {
      throw new Error('Se requiere conexión para eliminar');
    }

    const now = new Date().toISOString();

    await softDeleteUserAction(id);
    await db.perfiles.update(id, {
      activo: 0,
      deleted_at: now,
      actualizado_at: now,
      sync_status: 'synced',
    });
  };

  return {
    usuarios,
    isLoading,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
  };
}
