"use server";

import { supabaseAdmin } from "@/core/db/supabase/admin";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/core/db/supabase/server";
import { isPerfilActivo, isPerfilValido, normalizePerfilFromSupabase } from "@/shared/utils/perfil";
import { PasswordSchema, RolSchema } from "@/shared/schemas/validation";
import { AdminProfileUpdateSchema, CreateProfileSchema, SelfProfileUpdateSchema } from "../schemas/users";
import type { CreateProfileInput } from "../schemas/users";
import type { CreateUserData, Perfil } from "../types";

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

    return { ...perfil, id: userId };
  } catch (err) {
    // 'No autenticado' SE PROPAGA: no existe sesión válida, no se permite operar.
    // (El fallback que devolvía rol 'admin' fue eliminado — era explotable sin login.)
    throw err;
  }
}

async function requireUserConsistency() {
  const { data, error } = await supabaseAdmin.rpc('topico_user_consistency_ready');
  if (error || data !== true) {
    throw new Error('La gestión de cuentas no está disponible temporalmente. Contacta al administrador.');
  }
}

async function recoverProvisionedUser(input: CreateProfileInput, actorId: string, requestId: string) {
  const { data: profile, error } = await supabaseAdmin.from('perfiles').select('*')
    .eq('business_id', input.business_id).eq('email', input.email).maybeSingle();
  if (error || !profile) return null;
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
  if (authError || !authData.user || authData.user.email?.toLowerCase() !== input.email) return null;
  const marker = authData.user.app_metadata?.topico_provisioning;
  if (!marker || marker.version !== 1 || marker.request_id !== requestId
    || marker.requested_by !== actorId || marker.business_id !== input.business_id
    || marker.nombre !== input.nombre || marker.rol !== input.rol || marker.activo !== input.activo) return null;
  return normalizePerfilFromSupabase(profile);
}

export async function createUserAction(data: CreateUserData) {
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
  const actor = await validateAdminAccess(data.business_id);
  const parsed = CreateProfileSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const input = parsed.data;
  const requestId = input.request_id ?? crypto.randomUUID();
  await requireUserConsistency();

  // 1. Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true, // Confirmar automáticamente si lo crea un admin
    user_metadata: {
      nombre: input.nombre,
      rol: input.rol,
    },
    app_metadata: { topico_provisioning: {
      version: 1, request_id: requestId, requested_by: actor.id,
      business_id: input.business_id, nombre: input.nombre, rol: input.rol, activo: input.activo,
    } },
  });

  if (authError) {
    // Reintento después de una respuesta perdida: nunca adoptar cuentas ajenas.
    const recovered = await recoverProvisionedUser(input, actor.id, requestId);
    if (recovered) return { success: true as const, user: recovered };
    // Detectar error de email duplicado
    if (authError.message?.includes('already been registered') ||
      authError.message?.includes('already exists') ||
      authError.code === '23505') {
      throw new Error('El email ya está registrado. Usa otro email o revisa el usuario existente.');
    }
    throw new Error(authError.message);
  }

  if (!authData.user) throw new Error('No se pudo confirmar el alta. Reintenta con los mismos datos.');
  // El trigger nuevo crea el perfil dentro de la transacción de Auth.
  const { data: profile, error: profileError } = await supabaseAdmin.from('perfiles').select('*')
    .eq('id', authData.user.id).eq('business_id', input.business_id).single();
  if (profileError || !profile) throw new Error('No se pudo confirmar el alta. Reintenta con los mismos datos.');
  return { success: true as const, user: normalizePerfilFromSupabase(profile) };
}

export async function updateUserAction(id: string, data: Partial<Perfil>) {
  // Sin sesión => 'No autenticado' se propaga (nunca caer al path admin).
  const authenticatedUser = await getAuthenticatedUser();
  const currentUserId = authenticatedUser.id;

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

    let canonicalEmail = authenticatedUser.email;
    let emailConfirmationPending = false;
    if (selfInput.data.email !== undefined
      && selfInput.data.email.toLowerCase() !== ownProfile.email?.toLowerCase()
      && selfInput.data.email.toLowerCase() !== canonicalEmail?.toLowerCase()) {
      if (authenticatedUser.new_email?.toLowerCase() === selfInput.data.email.toLowerCase()) {
        // Reintento tras fallo de nombre/caché: no reenviar un correo ya pendiente.
        emailConfirmationPending = true;
      } else {
        await requireUserConsistency();
        const sessionClient = await createSupabaseServerClient();
        const { data: authData, error: authError } = await sessionClient.auth.updateUser({ email: selfInput.data.email });
        if (authError || !authData.user || authData.user.id !== id || !authData.user.email) {
          throw new Error('No se pudo solicitar el cambio de email. Reintenta más tarde.');
        }
        canonicalEmail = authData.user.email;
        emailConfirmationPending = canonicalEmail.toLowerCase() !== selfInput.data.email.toLowerCase();
      }
    }
    // Reparación dirigida de divergencia antigua: solo desde identidad Auth validada.
    if (canonicalEmail && canonicalEmail !== ownProfile.email) updatePayload.email = canonicalEmail;

    if (Object.keys(updatePayload).length === 0) {
      return { success: true as const, user: normalizePerfilFromSupabase(ownProfile), emailConfirmationPending };
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

    return { success: true as const, user: normalizePerfilFromSupabase(savedProfile), emailConfirmationPending };
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
  let canonicalEmail: string | undefined;
  if (adminInput.data.email !== undefined) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(id);
    if (authError || !authData.user?.email) throw new Error('No se pudo comprobar la cuenta de destino');
    canonicalEmail = authData.user.email;
    // Un email de formulario sin cambios no debe revertir una identidad Auth reparable.
    if (adminInput.data.email.toLowerCase() !== targetUser.email?.toLowerCase()
      && canonicalEmail.toLowerCase() !== adminInput.data.email.toLowerCase()) {
      await requireUserConsistency();
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
        email: adminInput.data.email, email_confirm: true,
      });
      if (authErr) throw new Error(`No se pudo actualizar el email: ${authErr.message}`);
      canonicalEmail = adminInput.data.email.toLowerCase();
    }
  }

  const updatePayload: Record<string, unknown> = {};
  if (adminInput.data.nombre !== undefined) updatePayload.nombre = adminInput.data.nombre;
  if (canonicalEmail) updatePayload.email = canonicalEmail;
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

  return { success: true as const, user: normalizePerfilFromSupabase(savedProfile), emailConfirmationPending: false };
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
