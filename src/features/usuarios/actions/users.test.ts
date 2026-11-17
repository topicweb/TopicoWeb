import { describe, it, expect, vi, beforeEach } from 'vitest';

// ───────────────────────────────────────────────────────────────────────────────
// Tests de seguridad para las server actions de usuarios
// Cubre: R1 (sin sesión → nunca admin) y R6 (IDOR cross-tenant)
// ───────────────────────────────────────────────────────────────────────────────

// Patrones Vitest: las variables que usa la factory de vi.mock DEBEN venir de
// vi.hoisted, porque las factories se ejecutan durante el hoisting (antes de que
// el módulo defina sus consts).
const { state, supabaseAdminMock, getAuthenticatedUserMock } = vi.hoisted(() => {
  const state = {
    /** Cola de respuestas para `.single()` (el test decide qué devuelve cada query) */
    singleResponses: [] as Array<{ data: unknown; error: unknown } | null>,
    /** Última llamada a .update(payload).eq('id', id) */
    lastUpdate: { payload: null as unknown, id: null as string | null },
    updateResponse: { error: null } as { error: { message: string } | null },
    updateDataNull: false,
    updateFilters: [] as Array<[string, unknown]>,
    /** Última llamada a auth.admin.updateUserById (R17) */
    lastAuthUpdate: null as { userId: string; attrs: { email?: string; email_confirm?: boolean } } | null,
    authUpdateResponse: { error: null } as { error: { message: string } | null },
    lastProfileRead: null as Record<string, unknown> | null,
    rpcResponse: { data: true, error: null } as { data: boolean; error: { message: string } | null },
    authCreateResponse: { data: { user: null }, error: { message: 'not configured' } } as {
      data: { user: { id: string } | null }; error: { message: string; code?: string } | null;
    },
    lastCreatePayload: null as Record<string, unknown> | null,
    lookupUser: null as { id: string; email: string; app_metadata?: Record<string, unknown> } | null,
    sessionUpdateResponse: { data: { user: null }, error: null } as {
      data: { user: { id: string; email: string } | null }; error: { message: string } | null;
    },
    lastSessionUpdate: null as { email: string } | null,
  };

  const supabaseAdminMock = {
    rpc: () => Promise.resolve(state.rpcResponse),
    from: () => {
      const readOne = () => {
        const response = state.singleResponses.shift() ?? { data: null, error: { message: 'no response configured' } };
        state.lastProfileRead = response.data as Record<string, unknown> | null;
        return Promise.resolve(response);
      };
      const self = {
        select: () => self,
        eq: () => self,
        single: readOne,
        maybeSingle: readOne,
        update: (payload: unknown) => {
          const mutation = {
            eq: (column: string, value: string | boolean) => {
              state.updateFilters.push([column, value]);
              if (column === 'id') state.lastUpdate = { payload, id: value as string };
              return mutation;
            },
            is: (column: string, value: null) => { state.updateFilters.push([column, value]); return mutation; },
            select: () => mutation,
            single: () => Promise.resolve({
              ...state.updateResponse,
              data: state.updateDataNull || state.updateResponse.error ? null : {
                id: state.lastUpdate.id, activo: true, rol: 'personal',
                business_id: '11111111-1111-4111-8111-111111111111',
                ...(payload as Record<string, unknown>),
              },
            }),
          };
          return mutation;
        },
      };
      return self;
    },
    auth: {
      admin: {
        createUser: (payload: Record<string, unknown>) => {
          state.lastCreatePayload = payload;
          return Promise.resolve(state.authCreateResponse);
        },
        getUserById: (id: string) => Promise.resolve({ data: { user: state.lookupUser ?? {
          id, email: state.lastProfileRead?.email ?? 'old@example.invalid', app_metadata: {},
        } }, error: null }),
        updateUserById: (userId: string, attrs: { email?: string; email_confirm?: boolean }) => {
          state.lastAuthUpdate = { userId, attrs };
          return Promise.resolve(state.authUpdateResponse);
        },
      },
    },
  };

  return { state, supabaseAdminMock, getAuthenticatedUserMock: vi.fn() };
});

vi.mock('@/core/db/supabase/admin', () => ({ supabaseAdmin: supabaseAdminMock }));
vi.mock(
  '@/core/db/supabase/server',
   () => ({
     getAuthenticatedUser: (...args: unknown[]) => getAuthenticatedUserMock(...args),
     createSupabaseServerClient: async () => ({ auth: {
       updateUser: (payload: { email: string }) => {
         state.lastSessionUpdate = payload;
         return Promise.resolve(state.sessionUpdateResponse);
       },
     } }),
   }),
);

import { updateUserAction, createUserAction, softDeleteUserAction } from './users';
import type { Perfil } from '../types';

const ADMIN_USER_ID = 'auth-user-1';
const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const REQUEST_ID = '33333333-3333-4333-8333-333333333333';

beforeEach(() => {
  vi.clearAllMocks();
  state.singleResponses = [];
  state.lastUpdate = { payload: null, id: null };
  state.updateResponse = { error: null };
  state.updateDataNull = false;
  state.updateFilters = [];
  state.lastAuthUpdate = null;
  state.authUpdateResponse = { error: null };
  state.lastProfileRead = null;
  state.rpcResponse = { data: true, error: null };
  state.authCreateResponse = { data: { user: null }, error: { message: 'not configured' } };
  state.lastCreatePayload = null;
  state.lookupUser = null;
  state.sessionUpdateResponse = { data: { user: null }, error: null };
  state.lastSessionUpdate = null;
});

// ───────────────────────────────────────────────────────────────────────────────
// validateAdminAccess (R1: sin sesión → JAMÁS devuelve un admin ficticio)
// Se prueba indirectamente a través de las actions (no está exportada).
// ───────────────────────────────────────────────────────────────────────────────

describe('updateUserAction — R1 sin sesión', () => {
  it('sin sesión: lanza "No autenticado" y NUNCA devuelve/cae al path admin', async () => {
    getAuthenticatedUserMock.mockRejectedValue(new Error('No autenticado'));

    await expect(
      updateUserAction('target-1', { nombre: 'Hack', rol: 'admin', business_id: TENANT_A }),
    ).rejects.toThrow('No autenticado');

    // No debió tocarse la BD
    expect(state.lastUpdate.id).toBeNull();
  });
});

describe('validateAdminAccess — R1 reglas de rol/tenant', () => {
  it('no-admin: lanza', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [{ data: { rol: 'personal', business_id: TENANT_A, activo: true }, error: null }];

    await expect(
      updateUserAction('target-1', { business_id: TENANT_A, rol: 'admin' }),
    ).rejects.toThrow('Solo administradores');
  });

  it('admin inactivo: lanza', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [{ data: { rol: 'admin', business_id: TENANT_A, activo: false }, error: null }];

    await expect(
      updateUserAction('target-1', { business_id: TENANT_A }),
    ).rejects.toThrow('Usuario inactivo');
  });

  it('admin con deleted_at: lanza aunque activo sea booleano true', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [{
      data: { rol: 'admin', business_id: TENANT_A, activo: true, deleted_at: '2026-01-01T00:00:00Z' },
      error: null,
    }];

    await expect(updateUserAction('target-1', { business_id: TENANT_A })).rejects.toThrow('Usuario inactivo');
    expect(state.lastUpdate.id).toBeNull();
  });

  it('admin de otro tenant: lanza', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [{ data: { rol: 'admin', business_id: TENANT_B, activo: true }, error: null }];

    await expect(
      updateUserAction('target-1', { business_id: TENANT_A }),
    ).rejects.toThrow('No tienes permiso para operar en esta institución');
  });
});

describe('updateUserAction — R6 IDOR cross-tenant', () => {
  it('admin del tenant A actualiza usuario DEL MISMO tenant → pasa', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    // Orden de trenza valida a validateAdminAccess (perfil admin tenant A, activo)…
    state.singleResponses = [
      { data: { rol: 'admin', business_id: TENANT_A, activo: true }, error: null },
      // …luego perfil destino: mismo tenant
      { data: { business_id: TENANT_A }, error: null },
    ];

    const result = await updateUserAction('target-1', { nombre: 'Nuevo Nombre', business_id: TENANT_A });

    expect(result).toMatchObject({ success: true, user: { activo: 1 } });
    expect(state.lastUpdate.id).toBe('target-1');
    expect((state.lastUpdate.payload as { nombre?: string }).nombre).toBe('Nuevo Nombre');
  });

  it('admin del tenant A intenta actualizar usuario del tenant B → lanza y NO actualiza', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [
      { data: { rol: 'admin', business_id: TENANT_A, activo: true }, error: null },
      { data: { business_id: TENANT_B }, error: null },
    ];

    await expect(
      updateUserAction('target-otro-tenant', { rol: 'personal', business_id: TENANT_A }),
    ).rejects.toThrow('No tienes permiso para operar sobre este usuario');

    expect(state.lastUpdate.id).toBeNull();
  });

  it('admin actualiza usuario del mismo tenant y le cambia el email → sincroniza Auth primero (R17)', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [
      { data: { rol: 'admin', business_id: TENANT_A, activo: true }, error: null },
      { data: { business_id: TENANT_A, email: 'vieja@inst.edu.pe' }, error: null },
    ];

    const result = await updateUserAction('target-1', {
      nombre: 'Nombre Cambiado',
      email: 'nueva@inst.edu.pe',
      business_id: TENANT_A,
    });

    expect(result).toMatchObject({ success: true, user: { activo: 1 } });
    // Auth actualizado primero, como usuario objetivo
    expect(state.lastAuthUpdate).toEqual({
      userId: 'target-1',
      attrs: { email: 'nueva@inst.edu.pe', email_confirm: true },
    });
    // perfiles refleja el nuevo email
    expect((state.lastUpdate.payload as { email?: string }).email).toBe('nueva@inst.edu.pe');
  });

  it('admin rechaza rol inválido antes de Auth o escritura', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });

    await expect(updateUserAction('target-1', {
      rol: 'superadmin' as unknown as Perfil['rol'], business_id: TENANT_A,
    })).rejects.toThrow('Rol inválido');
    expect(state.lastAuthUpdate).toBeNull();
    expect(state.lastUpdate.id).toBeNull();
  });

  it('admin rechaza email inválido antes de Auth o escritura', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });

    await expect(updateUserAction('target-1', { email: 'bad-email', business_id: TENANT_A }))
      .rejects.toThrow('Email inválido');
    expect(state.lastAuthUpdate).toBeNull();
    expect(state.lastUpdate.id).toBeNull();
  });

  it('admin intenta cambiar email a uno YA registrado en Auth → falla y no toca perfiles (R17)', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [
      { data: { rol: 'admin', business_id: TENANT_A, activo: true }, error: null },
      { data: { business_id: TENANT_A, email: 'vieja@inst.edu.pe' }, error: null },
    ];
    state.authUpdateResponse = { error: { message: 'email already in use' } };

    await expect(
      updateUserAction('target-1', { email: 'duplicado@inst.edu.pe', business_id: TENANT_A }),
    ).rejects.toThrow('No se pudo actualizar el email: email already in use');

    // Nada se escribió en perfiles
    expect(state.lastUpdate.id).toBeNull();
  });

  it('email SIN cambio → no toca Supabase Auth (R17)', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [
      { data: { rol: 'admin', business_id: TENANT_A, activo: true }, error: null },
      { data: { business_id: TENANT_A, email: 'misma@inst.edu.pe' }, error: null },
    ];

    await updateUserAction('target-1', { email: 'misma@inst.edu.pe', business_id: TENANT_A });

    expect(state.lastAuthUpdate).toBeNull();
  });

  it('admin trata de modificar su propio perfil: path self-update sin rol admin requerido', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [
      { data: { email: 'admin@inst.edu.pe', activo: true, deleted_at: null }, error: null },
    ];

    const result = await updateUserAction(ADMIN_USER_ID, {
      nombre: 'Mi Nombre', rol: 'personal', activo: 0, business_id: TENANT_B,
    });

    expect(result).toMatchObject({ success: true, user: { activo: 1 } });
    expect(state.lastUpdate.payload).toEqual({ nombre: 'Mi Nombre' });
    expect(state.lastAuthUpdate).toBeNull();
  });

  it.each([
    ['inactivo', { email: 'admin@inst.edu.pe', activo: false, deleted_at: null }],
    ['eliminado', { email: 'admin@inst.edu.pe', activo: true, deleted_at: '2026-01-01T00:00:00Z' }],
  ])('self-update bloquea perfil %s', async (_label, perfil) => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [{ data: perfil, error: null }];

    await expect(updateUserAction(ADMIN_USER_ID, { nombre: 'Cambio' })).rejects.toThrow('Usuario inactivo');
    expect(state.lastUpdate.id).toBeNull();
    expect(state.lastAuthUpdate).toBeNull();
  });

  it('self-update bloquea perfil inexistente o con error de lectura', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [{ data: null, error: { message: 'missing' } }];

    await expect(updateUserAction(ADMIN_USER_ID, { nombre: 'Cambio' })).rejects.toThrow('Usuario no encontrado');
    expect(state.lastUpdate.id).toBeNull();
  });

  it('self-update email inválido se rechaza sin Auth ni escritura de perfil', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [{ data: { email: 'admin@inst.edu.pe', activo: 1, deleted_at: null }, error: null }];

    await expect(updateUserAction(ADMIN_USER_ID, { email: 'no-es-email' })).rejects.toThrow('Email inválido');
    expect(state.lastAuthUpdate).toBeNull();
    expect(state.lastUpdate.id).toBeNull();
  });
});

describe('updateUserAction — confirmación de persistencia', () => {
  it('rechaza cero filas aunque no haya error SQL', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [
      { data: { rol: 'admin', business_id: TENANT_A, activo: true }, error: null },
      { data: { business_id: TENANT_A }, error: null },
    ];
    state.updateDataNull = true;
    await expect(updateUserAction('target-1', { business_id: TENANT_A, nombre: 'Cambio' }))
      .rejects.toThrow('confirmar la actualización');
  });

  it('filtra la escritura propia por activo y no eliminado', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [{ data: { id: ADMIN_USER_ID, activo: true, deleted_at: null }, error: null }];
    await updateUserAction(ADMIN_USER_ID, { nombre: 'Cambio' });
    expect(state.updateFilters).toContainEqual(['activo', true]);
    expect(state.updateFilters).toContainEqual(['deleted_at', null]);
  });

  it('sin cambios devuelve el perfil real y no envía un UPDATE vacío', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [{ data: { id: ADMIN_USER_ID, activo: true, rol: 'personal', email: 'own@example.invalid' }, error: null }];
    const result = await updateUserAction(ADMIN_USER_ID, { rol: 'admin', activo: 0 });
    expect(result.user).toMatchObject({ id: ADMIN_USER_ID, activo: 1, rol: 'personal', sync_status: 'synced' });
    expect(state.lastUpdate.id).toBeNull();
  });
});

describe('softDeleteUserAction — verificación de tenant del objetivo (sin regresión)', () => {
  it('devuelve la fila confirmada, normalizada y filtrada por tenant', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [
      { data: { business_id: TENANT_A }, error: null },
      { data: { rol: 'admin', business_id: TENANT_A, activo: true }, error: null },
    ];
    const result = await softDeleteUserAction('target-1');
    expect(result.user).toMatchObject({ id: 'target-1', activo: 0, sync_status: 'synced' });
    expect(result.user.deleted_at).toBeTruthy();
    expect(state.updateFilters).toContainEqual(['business_id', TENANT_A]);
  });

  it('no informa éxito si la base no devuelve ninguna fila', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [
      { data: { business_id: TENANT_A }, error: null },
      { data: { rol: 'admin', business_id: TENANT_A, activo: true }, error: null },
    ];
    state.updateDataNull = true;
    await expect(softDeleteUserAction('target-1')).rejects.toThrow('confirmar la desactivación');
  });

  it('admin del tenant A soft-deletes usuario del tenant B → lanza (la validación usa el tenant del objetivo)', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [
      // 1ª query: business_id del objetivo (tenant B)
      { data: { business_id: TENANT_B }, error: null },
      // validateAdminAccess obtiene el perfil del CALLER (tenant A) y falla contra B
      { data: { rol: 'admin', business_id: TENANT_A, activo: true }, error: null },
    ];

    await expect(softDeleteUserAction('target-otro-tenant')).rejects.toThrow(
      'No tienes permiso para operar en esta institución',
    );
  });
});

describe('fase 4b — correo propio y recuperación de alta', () => {
  const own = { id: ADMIN_USER_ID, email: 'old@example.invalid', activo: true, deleted_at: null, rol: 'personal' };
  const admin = { rol: 'admin', business_id: TENANT_A, activo: true };
  const input = { nombre: 'Nuevo', email: 'new@example.invalid', password: 'Passw0rd', business_id: TENANT_A, request_id: REQUEST_ID };
  const created = { id: 'created-1', nombre: input.nombre, email: input.email, business_id: TENANT_A, activo: true, rol: 'personal' };

  it('solicita confirmación de email propio sin auto-confirmar ni anticipar perfil', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID, email: own.email });
    state.singleResponses = [{ data: own, error: null }];
    state.sessionUpdateResponse = { data: { user: { id: ADMIN_USER_ID, email: own.email } }, error: null };
    const result = await updateUserAction(ADMIN_USER_ID, { email: input.email });
    expect(state.lastSessionUpdate).toEqual({ email: input.email });
    expect(state.lastAuthUpdate).toBeNull();
    expect(state.lastUpdate.id).toBeNull();
    expect(result).toMatchObject({ emailConfirmationPending: true, user: { email: own.email } });
  });

  it('conserva nombre confirmado mientras el correo solicitado queda pendiente', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID, email: own.email });
    state.singleResponses = [{ data: own, error: null }];
    state.sessionUpdateResponse = { data: { user: { id: ADMIN_USER_ID, email: own.email } }, error: null };
    const result = await updateUserAction(ADMIN_USER_ID, { email: input.email, nombre: ' Nombre ' });
    expect(state.lastUpdate.payload).toEqual({ nombre: 'Nombre' });
    expect(result.emailConfirmationPending).toBe(true);
  });

  it('reintenta guardar nombre sin reenviar un email que Auth ya tiene pendiente', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID, email: own.email, new_email: input.email });
    state.singleResponses = [{ data: own, error: null }];
    const result = await updateUserAction(ADMIN_USER_ID, { email: input.email, nombre: 'Nombre' });
    expect(state.lastSessionUpdate).toBeNull();
    expect(state.lastUpdate.payload).toEqual({ nombre: 'Nombre' });
    expect(result.emailConfirmationPending).toBe(true);
  });

  it('si Auth confirma inmediatamente solo refleja el correo canónico devuelto', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID, email: own.email });
    state.singleResponses = [{ data: own, error: null }];
    state.sessionUpdateResponse = { data: { user: { id: ADMIN_USER_ID, email: input.email } }, error: null };
    const result = await updateUserAction(ADMIN_USER_ID, { email: input.email });
    expect(result).toMatchObject({ emailConfirmationPending: false, user: { email: input.email } });
    expect(state.lastAuthUpdate).toBeNull();
  });

  it('repara perfil antiguo desde identidad Auth validada, sin modificar Auth', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID, email: input.email });
    state.singleResponses = [{ data: own, error: null }];
    await updateUserAction(ADMIN_USER_ID, { nombre: 'Nombre' });
    expect(state.lastUpdate.payload).toMatchObject({ email: input.email });
    expect(state.lastSessionUpdate).toBeNull();
    expect(state.lastAuthUpdate).toBeNull();
  });

  it('un correo de formulario sin cambios no revierte Auth en un perfil divergente', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID, email: input.email });
    state.singleResponses = [{ data: own, error: null }];
    const result = await updateUserAction(ADMIN_USER_ID, { email: own.email });
    expect(state.lastSessionUpdate).toBeNull();
    expect(result.user.email).toBe(input.email);
  });

  it('administrador repara divergencia si no solicitó un cambio real de correo', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [{ data: admin, error: null }, { data: { ...created, email: own.email }, error: null }];
    state.lookupUser = { id: created.id, email: input.email };
    const result = await updateUserAction(created.id, { business_id: TENANT_A, email: own.email });
    expect(state.lastAuthUpdate).toBeNull();
    expect(result.user.email).toBe(input.email);
  });

  it('no solicita correo si no están instaladas las garantías SQL', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID, email: own.email });
    state.singleResponses = [{ data: own, error: null }];
    state.rpcResponse = { data: false, error: null };
    await expect(updateUserAction(ADMIN_USER_ID, { email: input.email })).rejects.toThrow('temporalmente');
    expect(state.lastSessionUpdate).toBeNull();
    expect(state.lastUpdate.id).toBeNull();
  });

  it('Auth rechaza correo propio: no guarda cambios locales ni de perfil', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID, email: own.email });
    state.singleResponses = [{ data: own, error: null }];
    state.sessionUpdateResponse = { data: { user: null }, error: { message: 'rejected' } };
    await expect(updateUserAction(ADMIN_USER_ID, { email: input.email })).rejects.toThrow('solicitar');
    expect(state.lastUpdate.id).toBeNull();
  });

  it('no crea Auth antes de comprobar migración', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [{ data: admin, error: null }];
    state.rpcResponse = { data: false, error: null };
    await expect(createUserAction(input)).rejects.toThrow('temporalmente');
    expect(state.lastCreatePayload).toBeNull();
  });

  it('crea con contexto servidor y devuelve perfil confirmado, sin upsert separado', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [{ data: admin, error: null }, { data: created, error: null }];
    state.authCreateResponse = { data: { user: { id: created.id } }, error: null };
    const result = await createUserAction(input);
    expect(state.lastCreatePayload).toMatchObject({ app_metadata: { topico_provisioning: {
      version: 1, request_id: REQUEST_ID, requested_by: ADMIN_USER_ID, business_id: TENANT_A, activo: true,
    } } });
    expect(result.user).toMatchObject({ id: created.id, activo: 1, sync_status: 'synced' });
    expect(state.lastUpdate.id).toBeNull();
  });

  it('reintento recupera solo el alta propia del mismo intento lógico', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [{ data: admin, error: null }, { data: created, error: null }];
    state.authCreateResponse = { data: { user: null }, error: { message: 'already exists' } };
    state.lookupUser = { id: created.id, email: input.email, app_metadata: { topico_provisioning: {
      version: 1, request_id: REQUEST_ID, requested_by: ADMIN_USER_ID, business_id: TENANT_A,
      nombre: input.nombre, rol: 'personal', activo: true,
    } } };
    const result = await createUserAction(input);
    expect(result.user.id).toBe(created.id);
    expect(state.lastAuthUpdate).toBeNull();
    expect(state.lastUpdate.id).toBeNull();
  });

  it.each(['request_id', 'requested_by', 'business_id'] as const)('no adopta cuenta con %s distinto', async field => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [{ data: admin, error: null }, { data: created, error: null }];
    state.authCreateResponse = { data: { user: null }, error: { message: 'already exists' } };
    state.lookupUser = { id: created.id, email: input.email, app_metadata: { topico_provisioning: {
      version: 1, request_id: REQUEST_ID, requested_by: ADMIN_USER_ID, business_id: TENANT_A,
      nombre: input.nombre, rol: 'personal', activo: true, [field]: 'different',
    } } };
    await expect(createUserAction(input)).rejects.toThrow('registrado');
    expect(state.lastUpdate.id).toBeNull();
  });
});

describe('createUserAction — R1/R8 validaciones básicas', () => {
  it('sin sesión: rechaza', async () => {
    getAuthenticatedUserMock.mockRejectedValue(new Error('No autenticado'));

    await expect(
      createUserAction({ email: 'a@b.c', password: 'Passw0rd', business_id: TENANT_A, nombre: 'X' }),
    ).rejects.toThrow('No autenticado');
  });

  it('sin email o password: rechaza antes de tocar la BD', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });

    await expect(createUserAction({ password: 'Passw0rd', business_id: TENANT_A })).rejects.toThrow(
      'Email y contraseña son requeridos',
    );
  });

  it('R8: contraseña débil → rechaza con mensaje del policy', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });

    await expect(
      createUserAction({ email: 'n@i.pe', password: '123456', business_id: TENANT_A }),
    ).rejects.toThrow('La contraseña debe');
  });

  it('R18: rol inválido → rechaza', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });

    await expect(
      createUserAction({
        email: 'n2@i.pe',
        password: 'Passw0rd',
        // Atacante omitiendo tipos: llega 'superadmin' crudo por la red
        rol: 'superadmin' as unknown as Perfil['rol'],
        business_id: TENANT_A,
      }),
    ).rejects.toThrow('Rol inválido');
  });

  it('R9: updatePayload NUNCA incluye business_id (no se mueven cuentas de tenant)', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: ADMIN_USER_ID });
    state.singleResponses = [
      { data: { rol: 'admin', business_id: TENANT_A, activo: true }, error: null },
      { data: { business_id: TENANT_A }, error: null },
    ];

    await updateUserAction('target-1', { nombre: 'X', business_id: TENANT_A });

    expect((state.lastUpdate.payload as Record<string, unknown>).business_id).toBeUndefined();
  });
});
