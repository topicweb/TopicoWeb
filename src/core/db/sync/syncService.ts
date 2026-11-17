import { db } from '@/core/db';
import { supabase } from '@/core/db/supabase';
import { normalizeSignosVitales } from '@/features/atenciones/types';
import { withSupabaseRetry } from '@/core/utils/retry';
import type { Table } from 'dexie';

export type SyncContext = Readonly<{ userId: string; businessId: string; deviceId: string }>;
const TABLES = {
  instituciones: { push: false, created: true, incremental: false },
  perfiles: { push: false, created: true, incremental: true },
  programas_estudio: { push: false, created: true, incremental: true },
  pacientes: { push: true, created: true, incremental: true },
  medicamentos: { push: true, created: true, incremental: true },
  atenciones: { push: true, created: true, incremental: true },
  movimientos_stock: { push: true, created: false, incremental: true },
} as const;
type TableName = keyof typeof TABLES;
type Row = Record<string, unknown> & { id: string; business_id?: string; sync_status?: string };
const names = Object.keys(TABLES) as TableName[];
const key = (c: SyncContext, table?: TableName) => JSON.stringify([c.deviceId, c.businessId, c.userId, ...(table ? [table] : [])]);
const PAGE_SIZE = 200;
const timestamp = (value: unknown): bigint => {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return BigInt(-1);
  const fraction = value.match(/\.(\d+)/)?.[1] ?? '';
  return BigInt(Date.parse(value)) * BigInt(1000) + BigInt(fraction.slice(3, 6).padEnd(3, '0') || '0');
};
const fingerprint = (value: unknown): string => {
  if (Array.isArray(value)) return JSON.stringify(value.map(fingerprint));
  if (value && typeof value === 'object') return JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, fingerprint(v)]));
  return JSON.stringify(value) ?? 'undefined';
};

export class SyncService {
  private static instance: SyncService;
  private context: SyncContext | null = null;
  private generation = 0;
  private pulling = new Set<number>();
  private pushing = new Set<number>();
  static getInstance() { return this.instance ??= new SyncService(); }
  setContext(context: SyncContext | null) {
    if (this.context && context && key(this.context) === key(context)) return;
    this.cancelSync(); this.context = context ? { ...context } : null;
  }
  cancelSync() { this.generation++; }
  private check(c: SyncContext, generation: number) {
    if (!c.userId || !c.businessId || !c.deviceId || !this.context || key(c) !== key(this.context) || generation !== this.generation) throw new Error('Sync session expired');
  }
  private async authorize(c: SyncContext, generation: number) {
    this.check(c, generation);
    const { data, error } = await withSupabaseRetry(() => supabase.auth.getUser());
    this.check(c, generation);
    if (error || data.user?.id !== c.userId) throw new Error('Sync identity mismatch');
    const { data: perfil, error: profileError } = await withSupabaseRetry(() => supabase.from('perfiles').select('id,business_id,activo,deleted_at').eq('id', c.userId).maybeSingle());
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
  private async recordError(c: SyncContext, name: TableName, generation: number) {
    this.check(c, generation);
    const id = key(c, name);
    await db.transaction('rw', db.sync_table_metadata, async () => {
      this.check(c, generation);
      const previous = await db.sync_table_metadata.get(id);
      await db.sync_table_metadata.put({ ...previous, ...c, id, table: name, error: 'No se pudo completar la sincronización. Reintente.' });
    });
  }
  async pullFromSupabase(c: SyncContext) {
    const generation = this.generation;
    await this.authorize(c, generation);
    if (this.pulling.has(generation)) return;
    this.pulling.add(generation);
    try {
      const { data: upper } = await withSupabaseRetry(() => supabase.rpc('topico_sync_boundary'));
      this.check(c, generation);
      if (typeof upper !== 'string' || !Number.isFinite(Date.parse(upper))) throw new Error('Sync boundary unavailable');
      for (const name of names) {
        try {
          const table = this.table(name);
          const metadata = await db.sync_table_metadata.get(key(c, name));
          let after: Row | undefined;
          while (true) {
            const { data } = await withSupabaseRetry(async () => {
              await this.authorize(c, generation);
              let query = supabase.from(name).select('*').eq(name === 'instituciones' ? 'id' : 'business_id', c.businessId);
              if (TABLES[name].incremental) {
                query = query.lte('actualizado_at', upper).order('actualizado_at').order('id');
                // Repetir la frontera es idempotente y conserva empates.
                if (metadata?.lastSync) query = query.gte('actualizado_at', metadata.lastSync);
                if (after) query = query.or(`actualizado_at.gt.${after.actualizado_at},and(actualizado_at.eq.${after.actualizado_at},id.gt.${after.id})`);
              } else { query = query.order('id'); if (after) query = query.gt('id', after.id); }
              return await query.limit(PAGE_SIZE);
            });
            this.check(c, generation);
            if (!data) throw new Error('Sync page missing');
            const rows = data as Row[];
            if (rows.some(row => name === 'instituciones' ? row.id !== c.businessId : row.business_id !== c.businessId)) throw new Error('Sync scope mismatch');
            await db.transaction('rw', table, async () => {
              for (const row of rows) {
                this.check(c, generation);
                const local = await table.get(row.id);
                if (local?.sync_status === 'pending' || local?.sync_status === 'failed') continue;
                if (local && TABLES[name].incremental && timestamp(local.actualizado_at) > timestamp(row.actualizado_at)) continue;
                await table.put(this.normalize(name, row));
              }
              this.check(c, generation);
            });
            if (!rows.length) break;
            const next = rows[rows.length - 1];
            if (after && fingerprint(after) === fingerprint(next)) throw new Error('Sync pagination stalled');
            after = next;
            // No asumir que el límite efectivo de PostgREST coincide con PAGE_SIZE.
          }
          await db.transaction('rw', db.sync_table_metadata, async () => {
            this.check(c, generation);
            const previous = await db.sync_table_metadata.get(key(c, name));
            await db.sync_table_metadata.put({ ...c, id: key(c, name), table: name, lastSync: timestamp(previous?.lastSync) > timestamp(upper) ? previous!.lastSync : upper });
          });
        } catch (error) { await this.recordError(c, name, generation); throw error; }
      }
      await this.refreshStock(c, generation);
    } catch (error) { await this.recordError(c, 'pacientes', generation); throw error; }
    finally { this.pulling.delete(generation); }
  }
  private async reconcile(local: Row, c: SyncContext, generation: number) {
    await this.authorize(c, generation);
    const { data: remote } = await withSupabaseRetry(() => supabase.from('pacientes').select('*').eq('business_id', c.businessId).eq('dni', local.dni).maybeSingle());
    this.check(c, generation);
    if (!remote || remote.id === local.id || remote.business_id !== c.businessId) return;
    await db.transaction('rw', db.pacientes, db.atenciones, async () => {
      this.check(c, generation);
      const current = await this.table('pacientes').get(local.id);
      if (!current) return; // Reintento tras transacción ya confirmada.
      if (fingerprint(current) !== fingerprint(local)) throw new Error('Paciente editado durante reconciliación; reintente');
      const target = await this.table('pacientes').get(remote.id);
      if (target && target.business_id !== c.businessId) throw new Error('Sync scope mismatch');
      if (target?.sync_status === 'pending' || target?.sync_status === 'failed') throw new Error('Dos ediciones locales del mismo DNI requieren revisión');
      const atenciones = await db.atenciones.where('paciente_id').equals(local.id).filter(a => a.business_id === c.businessId).toArray();
      for (const a of atenciones) await db.atenciones.update(a.id, { paciente_id: remote.id, sync_status: 'pending' });
      // Conservar la edición pendiente, aunque el reloj local sea anterior.
      await this.table('pacientes').put({ ...current, id: remote.id });
      await db.pacientes.delete(local.id);
      this.check(c, generation);
    });
  }
  private payload(name: TableName, item: Row) {
    const row = { ...item }; delete row.sync_status; delete row.sync_error;
    if ('activo' in row) row.activo = row.activo === true || row.activo === 1;
    if (!TABLES[name].created) delete row.creado_at;
    delete row.actualizado_at; // Siempre asignado por el servidor.
    if (name === 'medicamentos') delete row.stock_actual; // Saldo remoto: solo eventos.
    if (name === 'atenciones') { row.diagnostico ??= ''; row.signos_vitales = normalizeSignosVitales(row.signos_vitales as Record<string, string>); }
    return row;
  }
  private async acknowledge(name: TableName, sent: Row[], accepted: Map<string, string>, c: SyncContext, generation: number) {
    const table = this.table(name);
    await db.transaction('rw', table, async () => {
      for (const snapshot of sent) {
        this.check(c, generation);
        const current = await table.get(snapshot.id);
        if (!current || current.business_id !== c.businessId || fingerprint(current) !== fingerprint(snapshot)) continue;
        await table.update(snapshot.id, accepted.has(snapshot.id) ? { sync_status: 'synced', actualizado_at: accepted.get(snapshot.id) } : { sync_status: 'failed' });
      }
      this.check(c, generation);
    });
  }
  async pushToSupabase(c: SyncContext) {
    const generation = this.generation;
    await this.authorize(c, generation);
    if (this.pushing.has(generation)) return;
    this.pushing.add(generation);
    try {
      // Fallar antes de escribir si el esquema aún no tiene autoridad de stock.
      const readiness = await withSupabaseRetry(() => supabase.rpc('topico_stock_snapshot', { medicine_ids: [], pending_ids: [] }));
      this.check(c, generation);
      if (!readiness.data || !Array.isArray(readiness.data.medicamentos) || !Array.isArray(readiness.data.applied_ids)) throw new Error('Stock schema unavailable');
      for (const name of names) {
        if (!TABLES[name].push) continue;
        const table = this.table(name);
        let sent: Row[] = [];
        try {
          const pending = async () => structuredClone(await table.where('sync_status').equals('pending').filter(row => row.business_id === c.businessId).toArray());
          let rows = await pending();
          if (name === 'pacientes') { for (const row of rows) await this.reconcile(row, c, generation); rows = await pending(); }
          for (let offset = 0; offset < rows.length; offset += 100) {
            sent = rows.slice(offset, offset + 100);
            const send = async () => {
              await this.authorize(c, generation);
              return await supabase.from(name).upsert(sent.map(row => this.payload(name, row)), { onConflict: 'id' }).select('id,actualizado_at');
            };
            let result;
            try { result = await withSupabaseRetry(send); }
            catch (error) {
              if (name !== 'pacientes' || (error as { code?: string }).code !== '23505') throw error;
              for (const row of sent) await this.reconcile(row, c, generation);
              // Releer la cola completa en el siguiente intento, sin ACK de IDs sustituidos.
              throw new Error('DNI reconciliado; reintente la sincronización');
            }
            this.check(c, generation);
            const accepted = new Map<string, string>((result.data ?? []).filter((row: { id: string; actualizado_at?: string }) => timestamp(row.actualizado_at) >= BigInt(0)).map((row: { id: string; actualizado_at: string }) => [row.id, row.actualizado_at]));
            await this.acknowledge(name, sent, accepted, c, generation);
            if (sent.some(row => !accepted.has(row.id))) throw new Error('Sync acknowledgement incomplete');
            sent = [];
          }
        } catch (error) {
          this.check(c, generation);
          await this.acknowledge(name, sent, new Map(), c, generation);
          await this.recordError(c, name, generation);
          if (name === 'movimientos_stock') {
            try { await this.refreshStock(c, generation); } catch { /* Conservar el error original y la cola. */ }
          }
          throw error;
        }
      }
      await this.refreshStock(c, generation);
    } finally { this.pushing.delete(generation); }
  }
  private async refreshStock(c: SyncContext, generation: number) {
    const medicines = await db.medicamentos.where('business_id').equals(c.businessId).filter(() => true).toArray();
    if (!medicines.length) return;
    // Limitar petición y transacción por lote; no transferir historia completa.
    for (let offset = 0; offset < medicines.length; offset += 100) {
      const ids = medicines.slice(offset, offset + 100).map(m => m.id);
      const pending = async () => await db.movimientos_stock.where('business_id').equals(c.businessId)
        .filter(m => ids.includes(m.medicamento_id) && (m.sync_status === 'pending' || m.sync_status === 'failed')).toArray();
      const before = await pending();
      const captured = new Map(medicines.slice(offset, offset + 100).map(m => [m.id, fingerprint(m)]));
      await this.authorize(c, generation);
      const { data } = await withSupabaseRetry(() => supabase.rpc('topico_stock_snapshot', { medicine_ids: ids, pending_ids: before.map(m => m.id) }));
      this.check(c, generation);
      if (!data || !Array.isArray(data.medicamentos) || !Array.isArray(data.applied_ids)) throw new Error('Stock snapshot unavailable');
      const applied = new Set<string>(data.applied_ids);
      await db.transaction('rw', db.medicamentos, db.movimientos_stock, async () => {
        this.check(c, generation);
        const current = await pending();
        // Otra pestaña/editó/envió durante la petición: conservar hasta siguiente sync.
        if (fingerprint(current) !== fingerprint(before)) return;
        for (const remote of data.medicamentos as Row[]) {
          if (remote.business_id !== c.businessId || !ids.includes(remote.id)) throw new Error('Stock scope mismatch');
          const local = await this.table('medicamentos').get(remote.id);
          if (!local || fingerprint(local) !== captured.get(remote.id)) continue;
          if (timestamp(local.actualizado_at) > timestamp(remote.actualizado_at) && local.sync_status === 'synced') continue;
          const delta = current.filter(m => m.medicamento_id === remote.id && m.sync_status === 'pending' && !applied.has(m.id))
            .reduce((sum, m) => sum + (m.tipo === 'ENTRADA' ? m.cantidad : -m.cantidad), 0);
          // Un conflicto remoto puede dejar proyección negativa; se muestra el saldo
          // confirmado y se conserva el evento failed para resolución/reintento.
          const projected = Number(remote.stock_actual) + delta;
          const stock = projected >= 0 ? projected : Number(remote.stock_actual);
          await this.table('medicamentos').update(remote.id, { stock_actual: stock });
        }
        this.check(c, generation);
      });
    }
  }
  async retryFailed(c: SyncContext) {
    const generation = this.generation;
    await this.authorize(c, generation);
    for (const name of names) {
      if (!TABLES[name].push) continue;
      const table = this.table(name);
      await db.transaction('rw', table, async () => {
        const failed = await table.where('sync_status').equals('failed').filter(row => row.business_id === c.businessId).toArray();
        for (const row of failed) { this.check(c, generation); await table.update(row.id, { sync_status: 'pending' }); }
      });
    }
    await this.fullSync(c);
  }
  async requestPush() { if (this.context) await this.pushToSupabase(this.context); }
  async fullSync(c: SyncContext) {
    this.check(c, this.generation);
    await this.pushToSupabase(c);
    await this.pullFromSupabase(c);
  }
}
export const syncService = SyncService.getInstance();
