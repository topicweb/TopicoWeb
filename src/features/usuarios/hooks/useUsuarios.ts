import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/core/providers/AuthProvider';
import { Perfil } from '../types';
import { createUserAction, softDeleteUserAction, updateUserAction } from '../actions/users';
import { db } from '@/core/db';
import { generateUUID } from '@/shared/utils/uuid';

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

  // ── OPERACIONES CRUD (OFFLINE-FIRST) ──────────────────────────────────────────

  const crearUsuario = async (
    usuario: Partial<Perfil> & { password?: string }
  ) => {
    if (!businessId) throw new Error('Business ID requerido');

    // 1. Crear registro optimista local para respuesta reactiva instantánea
    const tempId = generateUUID();
    const localUser: Perfil = {
      id: tempId,
      email: usuario.email!,
      nombre: usuario.nombre!,
      rol: usuario.rol || 'personal',
      business_id: businessId,
      activo: usuario.activo ?? 1,
      creado_at: new Date().toISOString(),
      actualizado_at: new Date().toISOString(),
      sync_status: navigator.onLine ? 'synced' : 'pending',
    };

    // Guardar en Dexie inmediatamente (reactivo para la UI)
    await db.perfiles.put(localUser);

    // 2. Si hay red, sincronizar con Supabase Auth
    if (navigator.onLine) {
      try {
        const result = await createUserAction({ ...usuario, business_id: businessId });

        if (result.success && result.user) {
          // Si el ID generado por Supabase difiere del temporal, limpiamos el temporal
          if (tempId !== result.user.id) {
            await db.perfiles.delete(tempId);
          }
          await db.perfiles.put(result.user);
          return result;
        }
      } catch (err: any) {
        console.warn('[useUsuarios] No se pudo crear en Supabase Auth inmediatamente:', err.message);
        // Mantenemos la creación local en Dexie para el modo offline
      }
    }

    return { success: true, user: localUser };
  };

  const actualizarUsuario = async (id: string, datos: Partial<Perfil>) => {
    if (!businessId) throw new Error('Business ID requerido');

    const now = new Date().toISOString();

    // 1. Actualización reactiva instantánea en la BD local Dexie
    await db.perfiles.update(id, {
      ...datos,
      actualizado_at: now,
      sync_status: navigator.onLine ? 'synced' : 'pending',
    });

    // 2. Si hay conexión, sincronizar con el servidor
    if (navigator.onLine) {
      try {
        await updateUserAction(id, { ...datos, business_id: businessId });
      } catch (err: any) {
        console.warn('[useUsuarios] No se pudo actualizar en Supabase:', err.message);
      }
    }
  };

  const eliminarUsuario = async (id: string) => {
    const now = new Date().toISOString();

    // 1. Soft-delete local instantáneo en Dexie
    await db.perfiles.update(id, {
      activo: 0,
      deleted_at: now,
      actualizado_at: now,
      sync_status: navigator.onLine ? 'synced' : 'pending',
    });

    // 2. Si hay conexión, sincronizar con el servidor
    if (navigator.onLine) {
      try {
        await softDeleteUserAction(id);
      } catch (err: any) {
        console.warn('[useUsuarios] No se pudo eliminar en Supabase:', err.message);
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
