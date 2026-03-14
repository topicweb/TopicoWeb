/**
 * @module features/usuarios/hooks/useUsuarios
 *
 * Hook central del módulo Usuarios/Perfiles.
 *
 * NOTA ESPECIAL: La creación de usuarios requiere Supabase Auth (Server Actions)
 * y conectividad. El patrón aquí es híbrido:
 *   - Crear/Eliminar → Server Action (requiere internet) + actualización local en Dexie.
 *   - Actualizar → Server Action si hay internet; Dexie 'pending' si offline.
 *   - Listar → useLiveQuery sobre Dexie (funciona offline).
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/core/providers/AuthProvider';
import { Perfil } from '../types';
import { createUserAction, softDeleteUserAction, updateUserAction } from '../actions/users';
import { db } from '@/core/db';

export function useUsuarios() {
  const { businessId } = useAuth();

  // ── 1. Lista reactiva desde Dexie (offline-first) ──────────────────────
  // Se filtran por business_id y se excluyen perfiles con soft-delete.
  const usuarios = useLiveQuery<Perfil[] | undefined>(
    () => {
      if (!businessId) return [];
      return db.perfiles
        .where('business_id').equals(businessId)
        .filter((p: Perfil) => !p.deleted_at && p.activo !== false)
        .toArray();
    },
    [businessId]
  ) ?? [];

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
      // UX: Insertamos en Dexie como 'synced' → aparece al instante en la tabla
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
        sync_status: 'synced', // Confirmado en servidor
      });
    } else {
      await db.perfiles.update(id, {
        ...datos,
        actualizado_at: new Date().toISOString(),
        sync_status: 'pending', // Pendiente de sincronizar
      });
    }
  };

  /**
   * Soft-delete de usuario: marca como inactivo en Dexie y en Supabase.
   * Si está offline, el SyncService propagará el delete al recuperar red.
   */
  const eliminarUsuario = async (id: string) => {
    const now = new Date().toISOString();

    // 1. Soft-delete local inmediato (funciona offline)
    await db.perfiles.update(id, {
      activo: false,
      deleted_at: now,
      actualizado_at: now,
      sync_status: 'pending',
    });

    // 2. Si hay internet, propagar al servidor de inmediato
    if (navigator.onLine) {
      try {
        await softDeleteUserAction(id);
        await db.perfiles.update(id, { sync_status: 'synced' });
      } catch (error) {
        console.error('Error propagando soft-delete al servidor:', error);
        // El registro queda como 'pending' — el SyncService lo reintentará
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
