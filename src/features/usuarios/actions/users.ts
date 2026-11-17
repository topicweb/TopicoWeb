"use server";

import { supabaseAdmin } from "@/core/db/supabase/admin";
import { getAuthenticatedUser } from "@/core/db/supabase/server";
import { isPerfilActivo, isPerfilValido, normalizePerfilFromSupabase } from "@/shared/utils/perfil";
import { PasswordSchema, RolSchema } from "@/shared/schemas/validation";
import { AdminProfileUpdateSchema, SelfProfileUpdateSchema } from "../schemas/users";
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
      .select('rol, business_id, activo, deleted_at')
      .eq('id', userId)
      .single();

    if (error || !perfil) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar que esté activo
    if (!isPerfilValido(perfil)) {
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
  } catch (err) {
    // 'No autenticado' SE PROPAGA: no existe sesión válida, no se permite operar.
    // (El fallback que devolvía rol 'admin' fue eliminado — era explotable sin login.)
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

  // R8: política de contraseñas (mínimo 8, 1 mayúscula, 1 número)
  const pwdCheck = PasswordSchema.safeParse(data.password);
  if (!pwdCheck.success) {
    throw new Error(pwdCheck.error.issues[0].message);
  }

  // R18: rol restringido al enum permitido
  if (data.rol && !RolSchema.safeParse(data.rol).success) {
    throw new Error("Rol inválido");
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

  // Upsert en perfiles: el trigger handle_new_user puede fallar en silencio;
  // un UPDATE solo no crea fila si el trigger no insertó el perfil.
  if (authData.user) {
    const activo =
      data.activo === undefined || data.activo === null
        ? true
        : isPerfilActivo(data.activo);

    const { error: profileError } = await supabaseAdmin
      .from('perfiles')
      .upsert(
        {
          id: authData.user.id,
          email: data.email,
          nombre: data.nombre,
          rol: data.rol || 'personal',
          activo,
          business_id: data.business_id,
          sync_status: 'synced',
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      throw new Error(`Usuario creado en Auth pero falló el perfil: ${profileError.message}`);
    }
  }

  const activoNormalizado =
    data.activo === undefined || data.activo === null
      ? 1
      : isPerfilActivo(data.activo)
        ? 1
        : 0;

  return {
    success: true,
    user: {
      id: authData.user!.id,
      email: data.email!,
      nombre: data.nombre!,
      rol: data.rol || 'personal',
      business_id: data.business_id!,
      activo: activoNormalizado,
      creado_at: new Date().toISOString(),
      actualizado_at: new Date().toISOString(),
      sync_status: 'synced',
    } as Perfil,
  };
}

export async function updateUserAction(id: string, data: Partial<Perfil>) {
  // Sin sesión => 'No autenticado' se propaga (nunca caer al path admin).
  const currentUserId = (await getAuthenticatedUser()).id;

  // Si el usuario está actualizando su propio perfil, permitir sin ser admin
  if (currentUserId && id === currentUserId) {
    const { data: ownProfile, error: ownProfileError } = await supabaseAdmin
      .from('perfiles')
      .select('*')
      .eq('id', id)
      .single();

    if (ownProfileError || !ownProfile) {
      throw new Error('Usuario no encontrado');
    }
    if (!isPerfilValido(ownProfile)) {
      throw new Error('Usuario inactivo');
    }

    // El formulario puede enviar rol/activo/business_id. Se validan y persisten
    // únicamente los campos de autoservicio; los privilegiados se ignoran.
    const selfInput = SelfProfileUpdateSchema.safeParse({
      ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
    });
    if (!selfInput.success) {
      throw new Error(selfInput.error.issues[0].message);
    }

    const updatePayload: Partial<Perfil> = {};
    if (selfInput.data.nombre !== undefined) updatePayload.nombre = selfInput.data.nombre;

    // R17: si cambia el email, actualizar Primero el email en Supabase Auth
    // (respeta unicidad y deja trail) y solo entonces reflejarlo en perfiles.
    if (selfInput.data.email !== undefined) {
      const emailChanged = ownProfile.email !== selfInput.data.email;
      if (emailChanged) {
        const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
          email: selfInput.data.email,
          email_confirm: true,
        });
        if (authErr) {
          throw new Error(`No se pudo actualizar el email: ${authErr.message}`);
        }
        updatePayload.email = selfInput.data.email;
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return { success: true as const, user: normalizePerfilFromSupabase(ownProfile) };
    }

    const { data: savedProfile, error } = await supabaseAdmin
      .from('perfiles')
      .update(updatePayload)
      .eq('id', id)
      .eq('activo', true)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    if (!savedProfile) throw new Error('No se pudo confirmar la actualización del perfil');

    return { success: true as const, user: normalizePerfilFromSupabase(savedProfile) };
  }

  // Si actualiza otro perfil, debe ser admin
  if (!data.business_id) {
    throw new Error("business_id es requerido");
  }

  const adminInput = AdminProfileUpdateSchema.safeParse({
    ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
    ...(data.email !== undefined ? { email: data.email } : {}),
    ...(data.rol !== undefined ? { rol: data.rol } : {}),
    ...(data.activo !== undefined ? { activo: data.activo } : {}),
  });
  if (!adminInput.success) {
    const invalidRole = adminInput.error.issues.some((issue) => issue.path[0] === 'rol');
    throw new Error(invalidRole ? 'Rol inválido' : adminInput.error.issues[0].message);
  }

  await validateAdminAccess(data.business_id);

  // R6 (IDOR): verificar que el usuario objetivo pertenezca al MISMO tenant
  // que el admin que llama. Sin esto, un admin del tenant A podía modificar
  // (rol, email, nombre) usuarios del tenant B.
  const { data: targetUser, error: targetError } = await supabaseAdmin
    .from('perfiles')
    .select('business_id, email')
    .eq('id', id)
    .single();

  if (targetError || !targetUser) {
    throw new Error('Usuario objetivo no encontrado');
  }

  if (targetUser.business_id !== data.business_id) {
    throw new Error('No tienes permiso para operar sobre este usuario');
  }

  // R17: si cambia el email, actualizar Primero el email en Supabase Auth
  // (respeta unicidad) y solo entonces reflejarlo en perfiles.
  const emailChanged = adminInput.data.email !== undefined && adminInput.data.email !== targetUser.email;
  if (emailChanged) {
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
      email: adminInput.data.email!,
      email_confirm: true,
    });
    if (authErr) {
      throw new Error(`No se pudo actualizar el email: ${authErr.message}`);
    }
  }

  const updatePayload: Record<string, unknown> = {};
  if (adminInput.data.nombre !== undefined) updatePayload.nombre = adminInput.data.nombre;
  if (emailChanged) updatePayload.email = adminInput.data.email;
  if (adminInput.data.rol !== undefined) updatePayload.rol = adminInput.data.rol;
  if (adminInput.data.activo !== undefined) updatePayload.activo = isPerfilActivo(adminInput.data.activo);
  // R9: NO se permite cambiar business_id aquí — el parámetro queda solo como
  // validación del tenant, no para mover cuentas entre instituciones.
  updatePayload.actualizado_at = new Date().toISOString();

  const { data: savedProfile, error } = await supabaseAdmin.from('perfiles')
    .update(updatePayload).eq('id', id).eq('business_id', data.business_id)
    .select('*').single();

  if (error) throw new Error(error.message);
  if (!savedProfile) throw new Error('No se pudo confirmar la actualización del perfil');

  return { success: true as const, user: normalizePerfilFromSupabase(savedProfile) };
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
  const { data: savedProfile, error } = await supabaseAdmin
    .from('perfiles')
    .update({
      activo: false,
      deleted_at: new Date().toISOString()
    })
    .eq('id', userId)
    .eq('business_id', targetUser.business_id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  if (!savedProfile) throw new Error('No se pudo confirmar la desactivación del usuario');

  return { success: true as const, user: normalizePerfilFromSupabase(savedProfile) };
}
