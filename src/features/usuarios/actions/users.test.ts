import { describe, it, expect, vi, beforeEach } from 'vitest';

// ───────────────────────────────────────────────────────────────────────────────
// Tests de seguridad para las server actions de usuarios
// Cubre: R1 (sin sesión → nunca admin) y R6 (IDOR cross-tenant)
// ───────────────────────────────────────────────────────────────────────────────

type SingleResponse = { data: unknown; error: unknown } | null;

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
    /** Última llamada a auth.admin.updateUserById (R17) */
    lastAuthUpdate: null as { userId: string; attrs: { email?: string; email_confirm?: boolean } } | null,
    authUpdateResponse: { error: null } as { error: { message: string } | null },
  };

  const supabaseAdminMock = {
    from: () => {
      const self = {
        select: () => self,
        eq: () => self,
        single: () =>
          Promise.resolve(
            state.singleResponses.shift() ??
              { data: null, error: { message: 'no response configured' } },
          ),
        update: (payload: unknown) => ({
          eq: (colOrId: string, maybeId?: string) => {
            // .update().eq('id', valor) → captura el valor del id objetivo
            const id = maybeId ?? colOrId;
            state.lastUpdate = { payload, id };
            return Promise.resolve(state.updateResponse);
          },
        }),
      };
      return self;
    },
    auth: {
      admin: {
        createUser: () =>
          Promise.resolve({ data: { user: null }, error: { message: 'not needed in tests' } }),
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
  () => ({ getAuthenticatedUser: (...args: unknown[]) => getAuthenticatedUserMock(...args) }),
);

import { updateUserAction, createUserAction, softDeleteUserAction } from './users';
import type { Perfil } from '../types';

const ADMIN_USER_ID = 'auth-user-1';
const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

beforeEach(() => {
  vi.clearAllMocks();
  state.singleResponses = [];
  state.lastUpdate = { payload: null, id: null };
  state.updateResponse = { error: null };
  state.lastAuthUpdate = null;
  state.authUpdateResponse = { error: null };
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

    expect(result).toEqual({ success: true });
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

    expect(result).toEqual({ success: true });
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

    expect(result).toEqual({ success: true });
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

describe('softDeleteUserAction — verificación de tenant del objetivo (sin regresión)', () => {
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
