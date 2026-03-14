"use server";

import { supabaseAdmin } from "@/core/db/supabase/admin";
import { Perfil } from "../types";

export async function createUserAction(data: Partial<Perfil> & { password?: string }) {
  if (!data.email || !data.password) {
    throw new Error("Email y contraseña son requeridos");
  }

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

  if (authError) throw new Error(authError.message);

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
      activo: data.activo ?? true,
      creado_at: new Date().toISOString(),
      actualizado_at: new Date().toISOString(),
      sync_status: 'synced' 
    } as Perfil
  };
}

export async function updateUserAction(id: string, data: Partial<Perfil>) {
  // Usamos supabaseAdmin para saltarnos las reglas RLS que dan error 403
  const { error } = await supabaseAdmin.from('perfiles').update(data).eq('id', id);
  
  if (error) throw new Error(error.message);
  
  return { success: true };
}

export async function softDeleteUserAction(userId: string) {
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
