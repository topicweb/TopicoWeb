import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  put: vi.fn(), update: vi.fn(), toArray: vi.fn(),
  updateAction: vi.fn(), deleteAction: vi.fn(), createAction: vi.fn(),
}));

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: (fn: () => unknown) => { void fn; return []; } }));
vi.mock('@/core/providers/AuthProvider', () => ({ useAuth: () => ({ businessId: 'tenant-a' }) }));
vi.mock('@/core/db', () => ({ db: { perfiles: { put: mocks.put, update: mocks.update, toArray: mocks.toArray } } }));
vi.mock('../actions/users', () => ({
  createUserAction: mocks.createAction,
  updateUserAction: mocks.updateAction,
  softDeleteUserAction: mocks.deleteAction,
}));

import { useUsuarios } from './useUsuarios';
import type { Perfil } from '../types';

const canonical: Perfil = {
  id: 'user-1', email: 'user@example.invalid', nombre: 'Canonical', rol: 'personal',
  activo: 1, business_id: 'tenant-a', sync_status: 'synced', actualizado_at: '2026-01-01T00:00:00Z',
  creado_at: '2026-01-01T00:00:00Z',
};

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: online });
}

describe('useUsuarios mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setOnline(true);
    mocks.put.mockResolvedValue(undefined);
    mocks.update.mockResolvedValue(1);
  });

  it('offline edit/delete reject without actions or local writes', async () => {
    setOnline(false);
    const hook = useUsuarios();
    await expect(hook.actualizarUsuario('user-1', { nombre: 'Draft' })).rejects.toThrow(/conexión/);
    await expect(hook.eliminarUsuario('user-1')).rejects.toThrow(/conexión/);
    expect(mocks.updateAction).not.toHaveBeenCalled();
    expect(mocks.deleteAction).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each(['update', 'delete'] as const)('%s action failure rejects and does not write Dexie', async kind => {
    const error = new Error('remote rejected');
    (kind === 'update' ? mocks.updateAction : mocks.deleteAction).mockRejectedValue(error);
    const hook = useUsuarios();
    const operation = kind === 'update'
      ? hook.actualizarUsuario('user-1', { nombre: 'Draft' })
      : hook.eliminarUsuario('user-1');
    await expect(operation).rejects.toBe(error);
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('persists only the canonical profile returned by self update', async () => {
    mocks.updateAction.mockResolvedValue({ success: true, user: canonical });
    const hook = useUsuarios();
    await hook.actualizarUsuario('user-1', { nombre: 'Draft', rol: 'admin', activo: 0, business_id: 'tenant-b' });
    expect(mocks.updateAction).toHaveBeenCalledWith('user-1', {
      nombre: 'Draft', rol: 'admin', activo: 0, business_id: 'tenant-a',
    });
    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(mocks.put).toHaveBeenCalledWith(canonical);
  });

  it('persists the canonical deleted profile only after successful delete', async () => {
    const deleted = { ...canonical, activo: 0, deleted_at: '2026-01-02T00:00:00Z' };
    mocks.deleteAction.mockResolvedValue({ success: true, user: deleted });
    await useUsuarios().eliminarUsuario('user-1');
    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(mocks.put).toHaveBeenCalledWith(deleted);
  });

  it.each(['update', 'delete'] as const)('%s propagates local put failure', async kind => {
    const error = new Error('Dexie failed');
    mocks.put.mockRejectedValue(error);
    (kind === 'update' ? mocks.updateAction : mocks.deleteAction).mockResolvedValue({ success: true, user: canonical });
    const hook = useUsuarios();
    const operation = kind === 'update'
      ? hook.actualizarUsuario('user-1', {})
      : hook.eliminarUsuario('user-1');
    await expect(operation).rejects.toBe(error);
  });
});
