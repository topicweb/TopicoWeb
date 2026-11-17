import Dexie from 'dexie';

/** The old shared database has no trustworthy account ownership. Keep it intact;
 * expose only aggregate notices after Auth has verified the current institution.
 * Legacy stock events require the phase-7 cutover review, never automatic replay. */
export async function countLegacyPending(businessId: string): Promise<number> {
  if (!await Dexie.exists('TopicoDatabase')) return 0;
  const legacy = new Dexie('TopicoDatabase');
  try {
    await legacy.open();
    let count=0;
    for (const name of ['pacientes','medicamentos','atenciones','movimientos_stock']) {
      if (!legacy.tables.some(table=>table.name===name)) continue;
      count+=await legacy.table(name).toCollection().filter(row=>row.business_id===businessId && (row.sync_status==='pending'||row.sync_status==='failed')).count();
    }
    return count;
  } finally { legacy.close(); }
}
