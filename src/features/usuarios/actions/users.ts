"use server";

import { supabaseAdmin } from "@/core/db/supabase/admin";
import { supabase } from "@/core/db/supabase";
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
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('No autenticado');
  }

  const userId = session.user.id;

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
}

export async function createUserAction(data: Partial<Perfil> & { password?: string }) {
  if (!data.email || !data.password) {
    throw new Error("Email y contraseña son requeridos");
  }

  if (!data.business_id) {
    throw new Error("business_id es requerido");
  }

  // Validar que el usuario actual sea admin y tenga el business_id correcto
  await validateAdminAccess(data.business_id);

  // 1. Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true, // Confirmar automáticamente si lo crea un admin
    user_metadata: {
      nombre: data.nombre,
      // El trigger SQL se encargará de crear el perfil en public.perfiles
      // usando estos metadatos
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

  // Opcional: Si quieres asignar el rol inmediatamente en la tabla perfiles
  // (aunque el trigger lo pone por defecto en 'personal', aquí forzamos el valor del formulario)
  if (authData.user) {
    const { error: profileError } = await supabaseAdmin
      .from('perfiles')
      .update({
        rol: data.rol,
        activo: data.activo,
        business_id: data.business_id // CRITICAL: Link new user to current business
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error("Error actualizando rol inicial:", profileError);
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
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('No autenticado');
  }

  const currentUserId = session.user.id;

  // Si el usuario está actualizando su propio perfil, permitir sin ser admin
  if (id === currentUserId) {
    // Permitir self-update, pero no cambiar rol o business_id
    const { error } = await supabaseAdmin
      .from('perfiles')
      .update({
        nombre: data.nombre,
        email: data.email,
        // No permitir cambiar rol o business_id en self-update
      })
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
  const { error } = await supabaseAdmin.from('perfiles').update(data).eq('id', id);

  if (error) throw new Error(error.message);

  return { success: true };
}

export async function softDeleteUserAction(userId: string) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('No autenticado');
  }

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
  // No borramos el usuario de Supabase Auth para mantener la integridad y permitir "deshacer".
  const { error } = await supabaseAdmin
    .from('perfiles')
    .update({
      activo: false,
      deleted_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    // Si el error es "User not found", significa que ya no está en Auth (inconsistencia),
    // pero permitimos continuar para borrar el perfil huérfano.
    if (!error.message.includes("User not found")) {
      throw new Error(error.message);
    }
  }

  // Opcional: Podrías deshabilitar el usuario en Auth en lugar de borrarlo
  // await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'none' });

  return { success: true };
}
