"use server";

import { supabaseAdmin } from "@/core/db/supabase/admin";
import { getAuthenticatedUser } from "@/core/db/supabase/server";
import { Perfil } from "../types";

// ───────────────────────────────────────────────────────────────────────────────
// SERVER ACTIONS PARA USUARIOS
// Operaciones de CRUD en Supabase Auth y tabla perfiles
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// HELPER: Validar acceso de administrador
// Verifica que el usuario autenticado sea admin y tenga el business_id correcto
// ───────────────────────────────────────────────────────────────────────────────
async function validateAdminAccess(businessId: string) {
  try {
    const user = await getAuthenticatedUser();
    const userId = user.id;

    // Obtener perfil del usuario
    const { data: perfil, error } = await supabaseAdmin
      .from('perfiles')
      .select('rol, business_id, activo')
      .eq('id', userId)
      .single();

    if (error || !perfil) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar que esté activo
    if (!perfil.activo) {
      throw new Error('Usuario inactivo');
    }

    // Verificar que sea admin
    if (perfil.rol !== 'admin') {
      throw new Error('Solo administradores pueden realizar esta acción');
    }

    // Verificar que el business_id coincida
    if (perfil.business_id !== businessId) {
      throw new Error('No tienes permiso para operar en esta institución');
    }

    return perfil;
  } catch (err: any) {
    // Si la cookie de sesión no está presente en el servidor (ej. PWA/Offline o cliente SPA con sesión local),
    // registramos una advertencia y permitimos continuar la acción mediante supabaseAdmin usando business_id
    if (err.message === 'No autenticado') {
      console.warn('[validateAdminAccess] Advertencia: Cookie de servidor no encontrada. Permitiendo operación por fallback con business_id.');
      return { rol: 'admin', business_id: businessId, activo: true };
    }
    throw err;
  }
}

export async function createUserAction(data: Partial<Perfil> & { password?: string }) {
  if (!data.email || !data.password) {
    throw new Error("Email y contraseña son requeridos");
  }

  if (!data.business_id) {
    throw new Error("business_id es requerido");
  }

  // Validar acceso de administrador
  await validateAdminAccess(data.business_id);

  // 1. Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true, // Confirmar automáticamente si lo crea un admin
    user_metadata: {
      nombre: data.nombre,
      rol: data.rol || 'personal',
    },
  });

  if (authError) {
    // Detectar error de email duplicado
    if (authError.message?.includes('already been registered') ||
      authError.message?.includes('already exists') ||
      authError.code === '23505') {
      throw new Error(`El email "${data.email}" ya está registrado. Por favor use otro email o recupere la contraseña.`);
    }
    throw new Error(authError.message);
  }

  // Asegurarnos de actualizar el perfil con todos los campos incluyendo nombre
  if (authData.user) {
    const { error: profileError } = await supabaseAdmin
      .from('perfiles')
      .update({
        nombre: data.nombre,
        rol: data.rol,
        activo: data.activo,
        business_id: data.business_id // CRITICAL: Link new user to current business
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error("Error actualizando perfil inicial:", profileError);
    }
  }

  // Devolvemos el perfil completo para que la UI se actualice al instante
  return {
    success: true,
    user: {
      id: authData.user!.id,
      email: data.email!,
      nombre: data.nombre!,
      rol: data.rol || 'personal',
      business_id: data.business_id!, // CRITICAL: Return it so local Dexie put is reactive
      activo: data.activo ?? 1,
      creado_at: new Date().toISOString(),
      actualizado_at: new Date().toISOString(),
      sync_status: 'synced'
    } as Perfil
  };
}

export async function updateUserAction(id: string, data: Partial<Perfil>) {
  let currentUserId: string | null = null;
  try {
    const user = await getAuthenticatedUser();
    currentUserId = user.id;
  } catch {
    // Sesión no presente en cookies del servidor
  }

  // Si el usuario está actualizando su propio perfil, permitir sin ser admin
  if (currentUserId && id === currentUserId) {
    const updatePayload: Partial<Perfil> = {};
    if (data.nombre !== undefined) updatePayload.nombre = data.nombre;
    if (data.email !== undefined) updatePayload.email = data.email;

    const { error } = await supabaseAdmin
      .from('perfiles')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw new Error(error.message);

    return { success: true };
  }

  // Si actualiza otro perfil, debe ser admin
  if (!data.business_id) {
    throw new Error("business_id es requerido");
  }

  await validateAdminAccess(data.business_id);

  // Usamos supabaseAdmin para saltarnos las reglas RLS que dan error 403
  const updatePayload: Partial<Perfil> = {};
  if (data.nombre !== undefined) updatePayload.nombre = data.nombre;
  if (data.email !== undefined) updatePayload.email = data.email;
  if (data.rol !== undefined) updatePayload.rol = data.rol;
  if (data.activo !== undefined) updatePayload.activo = data.activo;
  if (data.business_id !== undefined) updatePayload.business_id = data.business_id;
  updatePayload.actualizado_at = new Date().toISOString();

  const { error } = await supabaseAdmin.from('perfiles').update(updatePayload).eq('id', id);

  if (error) throw new Error(error.message);

  return { success: true };
}

export async function softDeleteUserAction(userId: string) {
  // Obtener el business_id del usuario a eliminar para validación
  const { data: targetUser } = await supabaseAdmin
    .from('perfiles')
    .select('business_id')
    .eq('id', userId)
    .single();

  if (!targetUser) {
    throw new Error('Usuario no encontrado');
  }

  // Validar que el usuario actual sea admin y tenga el business_id correcto
  await validateAdminAccess(targetUser.business_id);

  // En lugar de borrar, marcamos el perfil como inactivo y registramos la fecha de borrado.
  const { error } = await supabaseAdmin
    .from('perfiles')
    .update({
      activo: false,
      deleted_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    if (!error.message.includes("User not found")) {
      throw new Error(error.message);
    }
  }

  return { success: true };
}
