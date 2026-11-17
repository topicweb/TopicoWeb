import { beforeEach, describe, expect, it, vi } from 'vitest';
const s = vi.hoisted(() => ({ local: new Map<string, Record<string, unknown>[]>(), remote: new Map<string, Record<string, unknown>[]>(), meta: new Map<string, Record<string, unknown>>(), writes: [] as Record<string, unknown>[], user: 'a', tenant: 'A', active: true, schemaReady: true, stockGate: null as null | (() => Promise<void>), gate: null as null | (() => Promise<void>), edit: null as null | (() => void), failPage: 0, pages: 0, failPut: false, emptyAck: false }));
function table(name: string) {
  const rows = () => s.local.get(name) ?? [];
  return {
    get: async (id: string) => structuredClone(rows().find(r => r.id === id)),
    put: async (row: Record<string, unknown>) => { if (s.failPut && name === 'pacientes') throw new Error('disk'); s.local.set(name, [...rows().filter(r => r.id !== row.id), structuredClone(row)]); },
    update: async (id: string, changes: object) => { const row = rows().find(r => r.id === id); if (row) Object.assign(row, changes); },
    delete: async (id: string) => { s.local.set(name, rows().filter(r => r.id !== id)); },
    where: (field: string) => ({ equals: (value: unknown) => ({ filter: (predicate: (r: Record<string, unknown>) => boolean) => ({ toArray: async () => structuredClone(rows().filter(r => r[field] === value && predicate(r))) }) }) }),
  };
}
vi.mock('@/core/db', () => ({ db: new Proxy({
  sync_table_metadata: { get: async (id: string) => s.meta.get(id), put: async (row: Record<string, unknown>) => { s.meta.set(String(row.id), structuredClone(row)); } },
  transaction: async (...args: unknown[]) => {
    const snapshot = structuredClone(s.local), meta = structuredClone(s.meta);
    try { return await (args.at(-1) as () => Promise<unknown>)(); }
    catch (e) { s.local = snapshot; s.meta = meta; throw e; }
  },
}, { get: (target, name) => name in target ? target[name as keyof typeof target] : table(String(name)) }) }));
vi.mock('@/core/db/supabase', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: s.user } }, error: null }) },
  rpc: async (name: string) => { if (name === 'topico_stock_snapshot' && s.stockGate) await s.stockGate(); return ({ data: name === 'topico_stock_snapshot' ? !s.schemaReady ? null : { medicamentos: structuredClone(s.remote.get('medicamentos') ?? []), applied_ids: (s.remote.get('movimientos_stock') ?? []).map(r => r.id) } : '2026-11-17T12:00:00.000000+00:00', error: null }); },
  from: (name: string) => ({
    select: () => {
      const filters: Array<(r: Record<string, unknown>) => boolean> = [];
      const orders: string[] = [];
      let limit = 200;
      const q = {
        eq: (field: string, value: unknown) => { filters.push(r => r[field] === value); return q; },
        gte: (field: string, value: string) => { filters.push(r => String(r[field]) >= value); return q; },
        lte: (field: string, value: string) => { filters.push(r => String(r[field]) <= value); return q; },
        gt: (field: string, value: string) => { filters.push(r => String(r[field]) > value); return q; },
        order: (field: string) => { orders.push(field); return q; },
        limit: (value: number) => { limit = value; return q; },
        or: (value: string) => { const match = value.match(/^actualizado_at.gt.(.*),and\(actualizado_at.eq.(.*),id.gt.(.*)\)$/)!; filters.push(r => String(r.actualizado_at) > match[1] || (r.actualizado_at === match[2] && String(r.id) > match[3])); return q; },
        maybeSingle: async () => ({ data: name === 'perfiles' ? { id: s.user, business_id: s.tenant, activo: s.active } : (s.remote.get(name) ?? []).find(r => filters.every(f => f(r))) ?? null, error: null }),
        then: async (resolve: (v: unknown) => unknown) => {
          if (name === 'pacientes') { s.pages++; if (s.gate) await s.gate(); if (s.failPage === s.pages) return resolve({ data: null, error: { code: '42501' }, status: 403 }); }
          const rows = (s.remote.get(name) ?? []).filter(r => filters.every(f => f(r))).sort((a,b) => { for (const field of orders) { const c = String(a[field]).localeCompare(String(b[field])); if(c) return c; } return 0; }).slice(0, limit);
          return resolve({ data: structuredClone(rows), error: null });
        },
      }; return q;
    },
    upsert: (payload: Record<string, unknown>[]) => ({ select: async () => {
      s.writes.push(...structuredClone(payload));
      if (s.gate) await s.gate(); if (s.edit) s.edit();
      return { data: s.emptyAck ? [] : payload.map(r => ({ id: r.id, actualizado_at: '2026-11-17T11:00:00.123456+00:00' })), error: null };
    } }),
  }),
} }));
vi.mock('@/features/atenciones/types', () => ({ normalizeSignosVitales: (v: unknown) => v ?? {} }));
import { syncService, type SyncContext } from './syncService';
const A: SyncContext = { userId: 'a', businessId: 'A', deviceId: 'device' };
const B: SyncContext = { userId: 'b', businessId: 'B', deviceId: 'device' };
const row = (id: string, tenant = 'A', status = 'pending') => ({ id, business_id: tenant, sync_status: status, actualizado_at: '2026-11-16T00:00:00.000000+00:00', dni: id, nombres: 'local' });
const cursor = (name: string) => s.meta.get(JSON.stringify(['device','A','a',name]));
beforeEach(() => { s.local.clear(); s.remote.clear(); s.meta.clear(); s.writes=[]; s.user='a'; s.tenant='A'; s.active=true; s.schemaReady=true; s.stockGate=null; s.gate=null; s.edit=null; s.failPage=0; s.pages=0; s.failPut=false; s.emptyAck=false; syncService.setContext(null); syncService.setContext(A); });
describe('sync reliability', () => {
  it('fails closed before all writes when the stock migration is absent', async () => {
    s.schemaReady=false; s.local.set('pacientes',[row('p')]);
    await expect(syncService.pushToSupabase(A)).rejects.toThrow('Stock schema unavailable');
    expect(s.writes).toEqual([]); expect(s.local.get('pacientes')![0].sync_status).toBe('pending');
  });
  it('discards a delayed stock snapshot after logout', async () => {
    s.local.set('medicamentos',[{...row('m'),stock_actual:99}]);
    s.remote.set('medicamentos',[{...row('m','A','synced'),stock_actual:5}]);
    let release!:()=>void;
    s.stockGate=()=>new Promise<void>(resolve=>{release=resolve;});
    const promise=syncService.pullFromSupabase(A);
    await vi.waitFor(()=>expect(release).toBeTypeOf('function'));
    syncService.setContext(null); release();
    await expect(promise).rejects.toThrow('Sync session expired');
    expect(s.local.get('medicamentos')![0].stock_actual).toBe(99);
  });
  it('sends only current tenant and preserves foreign pending', async () => {
    s.local.set('pacientes', [row('a'),row('b','B')]); await syncService.pushToSupabase(A);
    expect(s.writes.map(r => r.id)).toEqual(['a']); expect(s.local.get('pacientes')?.find(r => r.id==='b')?.sync_status).toBe('pending');
  });
  it('supports logout B and return A', async () => {
    s.local.set('pacientes',[row('a'),row('b','B')]); syncService.setContext(null); syncService.setContext(B); s.user='b'; s.tenant='B'; await syncService.pushToSupabase(B);
    syncService.setContext(A); s.user='a'; s.tenant='A'; await syncService.pushToSupabase(A); expect(s.writes.map(r => r.id)).toEqual(['b','a']);
  });
  it.each(['identity','tenant','inactive'])('rejects invalid %s without sending', async kind => {
    if(kind==='identity') s.user='b'; if(kind==='tenant') s.tenant='B'; if(kind==='inactive') s.active=false;
    await expect(syncService.pushToSupabase(A)).rejects.toThrow(); expect(s.writes).toEqual([]);
  });
  it('excludes institutions and client timestamps from movement pushes', async () => {
    s.local.set('instituciones',[row('A')]); s.local.set('movimientos_stock',[{...row('m'),creado_at:'client'}]); await syncService.pushToSupabase(A);
    expect(s.writes).toHaveLength(1); expect(s.writes[0]).not.toHaveProperty('actualizado_at'); expect(s.writes[0]).not.toHaveProperty('creado_at');
  });
  it('preserves pending and failed against PULL', async () => {
    s.local.set('pacientes',[row('p'),row('f','A','failed')]); s.remote.set('pacientes',[{...row('p'),nombres:'remote'},{...row('f'),nombres:'remote'}]);
    await syncService.pullFromSupabase(A); expect(s.local.get('pacientes')?.map(r => r.nombres)).toEqual(['local','local']);
  });
  it('retrieves more than two pages with equal timestamps and ignores client clock', async () => {
    s.remote.set('pacientes',Array.from({length:425},(_,i)=>row(String(i).padStart(4,'0'),'A','synced')));
    vi.spyOn(Date,'now').mockReturnValue(0);
    try { await syncService.pullFromSupabase(A); } finally { vi.restoreAllMocks(); }
    expect(s.local.get('pacientes')).toHaveLength(425); expect(s.pages).toBe(4); expect(cursor('pacientes')?.lastSync).toBe('2026-11-17T12:00:00.000000+00:00');
  });
  it('does not advance a cursor after a failed page; replay completes without duplicates', async () => {
    s.remote.set('pacientes',Array.from({length:210},(_,i)=>row(String(i).padStart(4,'0'),'A','synced'))); s.failPage=2;
    await expect(syncService.pullFromSupabase(A)).rejects.toBeDefined(); expect(cursor('pacientes')?.lastSync).toBeUndefined(); expect(s.local.get('pacientes')).toHaveLength(200);
    s.failPage=0; await syncService.pullFromSupabase(A); expect(s.local.get('pacientes')).toHaveLength(210); expect(cursor('pacientes')?.error).toBeUndefined();
  });
  it('does not advance a cursor after local persistence fails', async () => {
    s.remote.set('pacientes',[row('p','A','synced')]); s.failPut=true; await expect(syncService.pullFromSupabase(A)).rejects.toThrow('disk'); expect(cursor('pacientes')?.lastSync).toBeUndefined();
  });
  it('old ACK cannot hide an edit made during the request', async () => {
    s.local.set('medicamentos',[row('m')]); s.edit=()=>{s.local.get('medicamentos')![0].nombres='new edit';}; await syncService.pushToSupabase(A);
    expect(s.local.get('medicamentos')![0].sync_status).toBe('pending'); expect(s.writes[0].nombres).toBe('local');
  });
  it('never uploads an absolute medicine stock snapshot', async () => {
    s.local.set('medicamentos', [{...row('m'), stock_actual: 99}]);
    await syncService.pushToSupabase(A);
    expect(s.writes[0]).not.toHaveProperty('stock_actual');
    expect(s.local.get('medicamentos')![0].stock_actual).toBe(99);
  });
  it('rebases stock on remote balance and preserves unconfirmed pending events', async () => {
    s.local.set('medicamentos', [{...row('m'), stock_actual: 90}]);
    s.remote.set('medicamentos', [{...row('m','A','synced'), stock_actual: 10}]);
    s.local.set('movimientos_stock', [{...row('waiting'), medicamento_id:'m', tipo:'SALIDA', cantidad:2}]);
    // PULL no envía los eventos locales; su proyección debe seguir visible.
    await syncService.pullFromSupabase(A);
    expect(s.local.get('medicamentos')![0].stock_actual).toBe(8);
    expect(s.local.get('movimientos_stock')![0].sync_status).toBe('pending');
  });
  it('does not count a pending replay already present remotely twice', async () => {
    s.local.set('medicamentos', [{...row('m'), stock_actual: 90}]);
    s.remote.set('medicamentos', [{...row('m','A','synced'), stock_actual: 8}]);
    const movement = {...row('waiting'), medicamento_id:'m', tipo:'SALIDA', cantidad:2};
    s.local.set('movimientos_stock', [movement]); s.remote.set('movimientos_stock', [movement]);
    await syncService.pullFromSupabase(A);
    expect(s.local.get('medicamentos')![0].stock_actual).toBe(8);
  });
  it('requires returned IDs and makes failed rows retryable', async () => {
    s.local.set('medicamentos',[row('m')]); s.emptyAck=true; await expect(syncService.pushToSupabase(A)).rejects.toThrow('incomplete'); expect(s.local.get('medicamentos')![0].sync_status).toBe('failed');
    s.emptyAck=false; await syncService.retryFailed(A); expect(s.local.get('medicamentos')![0].sync_status).toBe('synced');
  });
  it.each(['pull','push'])('discards late %s response after logout', async operation => {
    if(operation==='pull') s.remote.set('pacientes',[row('p')]); else s.local.set('medicamentos',[row('m')]);
    let release!:()=>void; s.gate=()=>new Promise<void>(resolve=>{release=resolve;});
    const promise=operation==='pull'?syncService.pullFromSupabase(A):syncService.pushToSupabase(A);
    await vi.waitFor(()=>expect(release).toBeTypeOf('function')); syncService.setContext(null); release(); await expect(promise).rejects.toThrow('Sync session expired');
    if(operation==='pull') expect(s.local.get('pacientes')).toBeUndefined(); else expect(s.local.get('medicamentos')![0].sync_status).toBe('pending');
  });
  it('reconciles DNI and references atomically, preserving local changes', async () => {
    s.local.set('pacientes',[row('old')]); s.remote.set('pacientes',[{...row('canonical'),dni:'old'}]); s.local.set('atenciones',[{...row('att'),paciente_id:'old'}]);
    s.failPut=true; await expect(syncService.pushToSupabase(A)).rejects.toThrow('disk'); expect(s.local.get('atenciones')![0].paciente_id).toBe('old'); expect(s.local.get('pacientes')![0].id).toBe('old');
    s.failPut=false; await syncService.pushToSupabase(A); expect(s.local.get('pacientes')![0].id).toBe('canonical'); expect(s.local.get('atenciones')![0].paciente_id).toBe('canonical');
  });
});

it('keeps a newer confirmed server version against an older pull response', async () => {
  s.local.set('medicamentos',[{...row('m','A','synced'),actualizado_at:'2026-11-17T11:00:00.123456+00:00'}]);
  s.remote.set('medicamentos',[{...row('m','A','synced'),actualizado_at:'2026-11-17T11:00:00.123455+00:00',nombres:'old response'}]);
  await syncService.pullFromSupabase(A); expect(s.local.get('medicamentos')![0].nombres).toBe('local');
});
it('stores the confirmed server timestamp in the ACK', async () => {
  s.local.set('medicamentos',[row('m')]); await syncService.pushToSupabase(A);
  expect(s.local.get('medicamentos')![0]).toMatchObject({sync_status:'synced',actualizado_at:'2026-11-17T11:00:00.123456+00:00'});
});
it('retains completed table cursors while a later table fails', async () => {
  s.failPage=1; await expect(syncService.pullFromSupabase(A)).rejects.toBeDefined();
  expect(cursor('perfiles')?.lastSync).toBeDefined(); expect(cursor('pacientes')?.lastSync).toBeUndefined();
});
