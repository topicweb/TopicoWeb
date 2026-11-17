import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>[]>(),
  requests: [] as Array<{ table: string; payload?: Record<string, unknown>[] }>,
  getUserId: 'user-a',
  profile: { id: 'user-a', business_id: 'tenant-a', activo: true, deleted_at: null } as Record<string, unknown>,
  requestGate: null as null | (() => Promise<void>),
  metadata: new Map<string, Record<string, unknown>>(),
  metadataWrites: [] as Record<string, unknown>[],
}));

function localTable(name: string) {
  const table = {
    toArray: async () => state.rows.get(name) ?? [],
    where: (field: string) => ({
      equals: (value: unknown) => ({
        filter: (predicate: (row: Record<string, unknown>) => boolean) => ({
          toArray: async () => (state.rows.get(name) ?? []).filter((row) => row[field] === value && predicate(row)),
        }),
        toArray: async () => (state.rows.get(name) ?? []).filter((row) => row[field] === value),
      }),
    }),
    bulkUpdate: async (updates: Array<{ key: string; changes: Record<string, unknown> }>) => {
      for (const update of updates) {
        const row = (state.rows.get(name) ?? []).find((item) => item.id === update.key);
        if (row) Object.assign(row, update.changes);
      }
      return updates.length;
    },
    bulkPut: async (incoming: Record<string, unknown>[]) => {
      const existing = state.rows.get(name) ?? [];
      for (const row of incoming) if (!existing.some((old) => old.id === row.id)) existing.push(row);
      state.rows.set(name, existing);
    },
    get: async (id: string) => (state.rows.get(name) ?? []).find((row) => row.id === id),
    put: async (row: Record<string, unknown>) => { state.rows.set(name, [...(state.rows.get(name) ?? []), row]); },
    delete: async (id: string) => { state.rows.set(name, (state.rows.get(name) ?? []).filter((row) => row.id !== id)); },
    update: async (id: string, changes: Record<string, unknown>) => {
      const row = (state.rows.get(name) ?? []).find((item) => item.id === id);
      if (row) Object.assign(row, changes);
    },
  };
  return table;
}

const supabaseMock = vi.hoisted(() => ({
  auth: { getUser: vi.fn(async () => ({ data: { user: { id: state.getUserId } }, error: null })) },
  from: vi.fn((table: string) => ({
    select: () => {
      let filters: Array<[string, unknown]> = [];
      const query: Record<string, unknown> = {};
      query.eq = (column: string, value: unknown) => {
        filters = [...filters, [column, value]];
        return query;
      };
      query.gt = () => query;
      query.maybeSingle = async () => ({ data: table === 'perfiles' ? state.profile : null, error: null });
      query.then = async (resolve: (value: unknown) => unknown) => {
        if (state.requestGate && table === 'pacientes') await state.requestGate();
        const found = (state.rows.get(table) ?? []).filter((row) => filters.every(([column, value]) => row[column] === value));
        return resolve({ data: found, error: null });
      };
      return query;
    },
    upsert: async (payload: Record<string, unknown>[]) => {
      if (state.requestGate) await state.requestGate();
      state.requests.push({ table, payload });
      return { error: null };
    },
  })),
}));

vi.mock('@/core/db', () => ({
  db: new Proxy({ sync_context_metadata: {
    get: async (id: string) => state.metadata.get(id),
    put: vi.fn(async (row: Record<string, unknown>) => { state.metadataWrites.push(row); state.metadata.set(String(row.id), row); }),
  } }, {
    get: (target, key) => key in target ? target[key as keyof typeof target] : localTable(String(key)),
  }),
}));
vi.mock('@/core/db/supabase', () => ({ supabase: supabaseMock }));
vi.mock('@/features/atenciones/types', () => ({ normalizeSignosVitales: (value: unknown) => value ?? {} }));

import { syncService, type SyncContext } from './syncService';

const contextA: SyncContext = { userId: 'user-a', businessId: 'tenant-a', deviceId: 'device-a' };
const contextB: SyncContext = { userId: 'user-b', businessId: 'tenant-b', deviceId: 'device-a' };

describe('syncService tenant scoping and cancellation', () => {
  beforeEach(() => {
    state.rows.clear(); state.requests.length = 0; state.requestGate = null; state.metadata.clear(); state.metadataWrites.length = 0;
    state.getUserId = 'user-a';
    state.profile = { id: 'user-a', business_id: 'tenant-a', activo: true, deleted_at: null };
    vi.clearAllMocks(); syncService.setContext(null); syncService.setContext(contextA);
  });

  it('pushes only pending rows belonging to the current tenant', async () => {
    state.rows.set('pacientes', [
      { id: 'a1', business_id: 'tenant-a', sync_status: 'pending', dni: '00000001' },
      { id: 'b1', business_id: 'tenant-b', sync_status: 'pending', dni: '00000002' },
    ]);
    await syncService.pushToSupabase(contextA);
    const sent = state.requests.flatMap((request) => request.payload ?? []);
    expect(sent.every((row) => row.business_id === 'tenant-a')).toBe(true);
    expect(sent.some((row) => row.id === 'b1')).toBe(false);
    expect(state.rows.get('pacientes')?.find((row) => row.id === 'b1')?.sync_status).toBe('pending');
  });

  it('discards a remote pull response after the session changes', async () => {
    let release!: () => void;
    state.requestGate = () => new Promise<void>((resolve) => { release = resolve; });
    const pull = syncService.pullFromSupabase(contextA);
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    syncService.setContext(null);
    release();
    await expect(pull).rejects.toThrow('Sync session expired');
    expect((state.rows.get('pacientes') ?? []).length).toBe(0);
  });

  it('supports A logout, B session, and return to A without cross tenant writes', async () => {
    state.rows.set('pacientes', [
      { id: 'a1', business_id: 'tenant-a', sync_status: 'pending', dni: '00000001' },
      { id: 'b1', business_id: 'tenant-b', sync_status: 'pending', dni: '00000002' },
    ]);
    syncService.setContext(null);
    syncService.setContext(contextB);
    state.getUserId = 'user-b'; state.profile = { id: 'user-b', business_id: 'tenant-b', activo: true, deleted_at: null };
    await syncService.pushToSupabase(contextB);
    syncService.setContext(null); syncService.setContext(contextA);
    state.getUserId = 'user-a'; state.profile = { id: 'user-a', business_id: 'tenant-a', activo: true, deleted_at: null };
    await syncService.pushToSupabase(contextA);
    expect(state.requests.flatMap((r) => r.payload ?? []).map((row) => row.business_id)).toEqual(['tenant-b', 'tenant-a']);
  });

  it('never pushes institutions and retains actualizado_at but omits creado_at from movement payloads', async () => {
    state.rows.set('instituciones', [{ id: 'tenant-a', business_id: 'tenant-a', sync_status: 'pending' }]);
    state.rows.set('medicamentos', [{ id: 'med1', business_id: 'tenant-a', sync_status: 'synced' }]);
    state.rows.set('movimientos_stock', [{ id: 'm1', business_id: 'tenant-a', medicamento_id: 'med1', sync_status: 'pending', creado_at: 'c', actualizado_at: 'u' }]);
    await syncService.pushToSupabase(contextA);
    expect(state.requests.some((r) => r.table === 'instituciones')).toBe(false);
    const movement = state.requests.find((r) => r.table === 'movimientos_stock')?.payload?.[0];
    expect(movement).toBeDefined();
    expect(movement).not.toHaveProperty('creado_at');
    expect(movement).toHaveProperty('actualizado_at', 'u');
  });

  it.each([
    ['auth user mismatch', () => { state.getUserId = 'user-b'; }, /Sync identity mismatch/],
    ['profile tenant mismatch', () => { state.profile = { id: 'user-a', business_id: 'tenant-b', activo: true, deleted_at: null }; }, /Sync profile rejected/],
    ['inactive profile', () => { state.profile = { id: 'user-a', business_id: 'tenant-a', activo: false, deleted_at: null }; }, /Sync profile rejected/],
  ])('rejects %s before any upsert', async (_label, setup, error) => {
    state.rows.set('medicamentos', [{ id: 'x', business_id: 'tenant-a', sync_status: 'pending' }]);
    setup();
    await expect(syncService.pushToSupabase(contextA)).rejects.toThrow(error);
    expect(state.requests).toHaveLength(0);
  });

  it('keeps pull metadata scoped by device, user, and tenant', async () => {
    syncService.setContext(null); syncService.setContext(contextA);
    await syncService.pullFromSupabase(contextA);
    syncService.setContext(null); syncService.setContext(contextB);
    state.getUserId = 'user-b'; state.profile = { id: 'user-b', business_id: 'tenant-b', activo: true, deleted_at: null };
    await syncService.pullFromSupabase(contextB);
    expect(state.metadataWrites).toHaveLength(2);
    expect(state.metadataWrites[0].id).not.toBe(state.metadataWrites[1].id);
    expect(state.metadataWrites.map((row) => row.businessId).sort()).toEqual(['tenant-a', 'tenant-b']);
  });

  it('does not acknowledge a push response after the context changes', async () => {
    state.rows.set('medicamentos', [{ id: 'm1', business_id: 'tenant-a', sync_status: 'pending' }]);
    let release!: () => void;
    state.requestGate = () => new Promise<void>((resolve) => { release = resolve; });
    const push = syncService.pushToSupabase(contextA);
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    syncService.setContext(null);
    release();
    await expect(push).rejects.toThrow('Sync session expired');
    expect(state.rows.get('medicamentos')?.[0].sync_status).toBe('pending');
  });
});
