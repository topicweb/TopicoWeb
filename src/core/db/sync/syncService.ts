import { db } from '@/core/db';
import { supabase } from '@/core/db/supabase';
import { normalizeSignosVitales } from '@/features/atenciones/types';
import { withRetry } from '@/core/utils/retry';
import type { Table } from 'dexie';

export type SyncContext = Readonly<{ userId: string; businessId: string; deviceId: string }>;
// Contrato cerrado. Movimientos tiene actualizado_at pero conserva PULL completo hasta fase 6.
const TABLES = {
  instituciones: { push: false, created: true, updated: false, incremental: false },
  perfiles: { push: false, created: true, updated: true, incremental: true },
  programas_estudio: { push: false, created: true, updated: true, incremental: true },
  pacientes: { push: true, created: true, updated: true, incremental: true },
  medicamentos: { push: true, created: true, updated: true, incremental: true },
  atenciones: { push: true, created: true, updated: true, incremental: true },
  movimientos_stock: { push: true, created: false, updated: true, incremental: false },
} as const;
type TableName = keyof typeof TABLES;
type Row = Record<string, unknown> & { id: string; business_id?: string; sync_status?: string };
const names = Object.keys(TABLES) as TableName[];
const key = (c: SyncContext) => JSON.stringify([c.deviceId, c.businessId, c.userId]);

export class SyncService {
  private static instance: SyncService;
  private context: SyncContext | null = null;
  private generation = 0;
  private pulling = new Set<number>();
  private pushing = new Set<number>();
  private lastFullSync = 0;
  static getInstance() { return this.instance ??= new SyncService(); }
  setContext(context: SyncContext | null) {
    if (this.context && context && key(this.context) === key(context)) return;
    this.cancelSync();
    this.context = context ? { ...context } : null;
  }
  cancelSync() { this.generation++; this.lastFullSync = 0; }
  private check(c: SyncContext, generation: number) {
    if (!c.userId || !c.businessId || !c.deviceId || !this.context || key(c) !== key(this.context) || generation !== this.generation) throw new Error('Sync session expired');
  }
  private async authorize(c: SyncContext, generation: number) {
    this.check(c, generation);
    const { data, error } = await supabase.auth.getUser();
    this.check(c, generation);
    if (error || data.user?.id !== c.userId) throw new Error('Sync identity mismatch');
    const { data: perfil, error: profileError } = await supabase.from('perfiles').select('id,business_id,activo,deleted_at').eq('id', c.userId).maybeSingle();
    this.check(c, generation);
    if (profileError || !perfil || perfil.business_id !== c.businessId || !perfil.activo || perfil.deleted_at) throw new Error('Sync profile rejected');
  }
  private table(name: TableName) { return db[name] as unknown as Table<Row, string>; }
  private normalize(name: TableName, item: Row): Row {
    const row: Row = { ...item, sync_status: 'synced' };
    if ('activo' in row) row.activo = row.activo === true || row.activo === 1 ? 1 : 0;
    if (name === 'atenciones') { row.diagnostico ??= ''; row.signos_vitales = normalizeSignosVitales(row.signos_vitales as Record<string, string>); }
    return row;
  }
  async pullFromSupabase(c: SyncContext) {
    const generation = this.generation;
    await this.authorize(c, generation);
    if (this.pulling.has(generation)) return;
    this.pulling.add(generation);
    try {
      const metadata = await db.sync_context_metadata.get(key(c));
      for (const name of names) {
        await this.authorize(c, generation);
        let query = supabase.from(name).select('*').eq(name === 'instituciones' ? 'id' : 'business_id', c.businessId);
        if (metadata && TABLES[name].incremental) query = query.gt('actualizado_at', metadata.lastSync);
        const { data, error } = await withRetry(async () => { await this.authorize(c, generation); return await query; }, { maxRetries: 2 });
        this.check(c, generation);
        if (error) throw error;
        const rows = (data ?? []).filter((row: Row) => name === 'instituciones' ? row.id === c.businessId : row.business_id === c.businessId);
        if (rows.length) await this.table(name).bulkPut(rows.map((row: Row) => this.normalize(name, row)));
      }
      this.check(c, generation);
      await db.sync_context_metadata.put({ ...c, id: key(c), lastSync: new Date().toISOString() });
    } finally { this.pulling.delete(generation); }
  }
  private async reconcile(local: Row, c: SyncContext, generation: number) {
    await this.authorize(c, generation);
    const { data: remote, error } = await supabase.from('pacientes').select('*').eq('business_id', c.businessId).eq('dni', local.dni).maybeSingle();
    this.check(c, generation);
    if (error) throw error;
    if (!remote || remote.id === local.id || remote.business_id !== c.businessId) return;
    const atenciones = await db.atenciones.where('paciente_id').equals(local.id).filter(a => a.business_id === c.businessId).toArray();
    for (const a of atenciones) { this.check(c, generation); await db.atenciones.update(a.id, { paciente_id: remote.id, sync_status: 'pending' }); }
    this.check(c, generation);
    const localTime = Date.parse(String(local.actualizado_at || local.creado_at));
    const remoteTime = Date.parse(String(remote.actualizado_at || remote.creado_at));
    await this.table('pacientes').put(localTime >= remoteTime ? { ...local, id: remote.id } : this.normalize('pacientes', remote));
    this.check(c, generation);
    await db.pacientes.delete(local.id);
  }
  async pushToSupabase(c: SyncContext) {
    const generation = this.generation;
    await this.authorize(c, generation);
    if (this.pushing.has(generation)) return;
    this.pushing.add(generation);
    try {
      for (const name of names) {
        if (!TABLES[name].push) continue;
        const table = this.table(name);
        const pending = () => table.where('sync_status').equals('pending').filter(row => row.business_id === c.businessId).toArray();
        let rows = await pending();
        if (name === 'pacientes') {
          for (const row of rows) await this.reconcile(row, c, generation);
          rows = await pending(); // Reaplicar aislamiento después de reconciliar.
        }
        this.check(c, generation);
        if (!rows.length) continue;
        if (name === 'movimientos_stock') {
          const medicamentos = new Set((await db.medicamentos.toArray()).filter(m => m.business_id === c.businessId).map(m => m.id));
          this.check(c, generation);
          const invalid = rows.filter(row => !medicamentos.has(String(row.medicamento_id)));
          await table.bulkUpdate(invalid.map(row => ({ key: row.id, changes: { sync_status: 'failed' } })));
          rows = rows.filter(row => medicamentos.has(String(row.medicamento_id)));
        }
        if (!rows.length) continue;
        const toPayload = (item: Row) => {
          const row = { ...item }; delete row.sync_status; delete row.deleted_at;
          if ('activo' in row) row.activo = row.activo === true || row.activo === 1;
          if (!TABLES[name].created) delete row.creado_at;
          if (!TABLES[name].updated) delete row.actualizado_at;
          if (name === 'movimientos_stock') row.tipo_medida ||= 'UNIDAD';
          if (name === 'atenciones') { row.diagnostico ??= ''; row.signos_vitales = normalizeSignosVitales(row.signos_vitales as Record<string, string>); }
          return row;
        };
        let payload = rows.map(toPayload);
        await this.authorize(c, generation);
        let { error } = await withRetry(async () => { await this.authorize(c, generation); return await supabase.from(name).upsert(payload, { onConflict: 'id' }); }, { maxRetries: 2 });
        this.check(c, generation);
        if (error?.code === '23505' && name === 'pacientes') {
          for (const row of rows) await this.reconcile(row, c, generation);
          rows = await pending();
          this.check(c, generation);
          payload = rows.map(toPayload);
          if (rows.length) {
            await this.authorize(c, generation);
            ({ error } = await supabase.from(name).upsert(payload, { onConflict: 'id' }));
            this.check(c, generation);
          } else error = null;
        }
        if (error) throw error;
        await table.bulkUpdate(rows.map(row => ({ key: row.id, changes: { sync_status: 'synced' } })));
      }
    } finally { this.pushing.delete(generation); }
  }
  async requestPush() { if (this.context) await this.pushToSupabase(this.context); }
  async fullSync(c: SyncContext) {
    this.check(c, this.generation);
    if (Date.now() - this.lastFullSync < 60000) return;
    this.lastFullSync = Date.now();
    await this.pullFromSupabase(c);
    await this.pushToSupabase(c);
  }
}
export const syncService = SyncService.getInstance();
