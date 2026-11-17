"use client";
import { useLiveQuery } from 'dexie-react-hooks';
import type { Table } from 'dexie';
import { useState } from 'react';
import { db } from '@/core/db';
import { useAuth } from '@/core/providers/AuthProvider';
import { useNetwork } from '@/core/providers/NetworkProvider';
import { useBidirectionalSync } from '@/core/hooks/useBidirectionalSync';
import { getDeviceId } from '@/core/utils/deviceId';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export const SyncMonitor = ({ variant = 'fixed' }: { variant?: 'fixed' | 'inline' }) => {
  const { businessId, user } = useAuth();
  const { isOnline } = useNetwork();
  const { forceSync, retryFailed, isSyncing } = useBidirectionalSync();
  const [requestError, setRequestError] = useState<string | null>(null);
  const status = useLiveQuery(async () => {
    if (!businessId || !user) return { pending: 0, failed: 0, error: false };
    const tables = [db.pacientes, db.atenciones, db.movimientos_stock, db.medicamentos] as unknown as Table<{ business_id: string }, string>[];
    const pending = await Promise.all(tables.map(table => table.where('sync_status').equals('pending').filter(row => row.business_id === businessId).count()));
    const failed = await Promise.all(tables.map(table => table.where('sync_status').equals('failed').filter(row => row.business_id === businessId).count()));
    const errors = await db.sync_table_metadata.where('businessId').equals(businessId).filter(row => row.userId === user.id && row.deviceId === getDeviceId() && !!row.error).count();
    return { pending: pending.reduce((a, b) => a + b, 0), failed: failed.reduce((a, b) => a + b, 0), error: errors > 0 };
  }, [businessId, user?.id]);
  const hasError = !!status?.failed || !!status?.error || (!!requestError && requestError === businessId);
  const run = async () => {
    try { if (status?.failed) await retryFailed(); else await forceSync(); setRequestError(null); }
    catch { setRequestError(businessId); }
  };
  return <div className={variant === 'fixed' ? 'hidden md:block fixed top-4 right-4 z-50' : 'w-full'}>
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      {isOnline ? <Cloud size={16} /> : <CloudOff size={16} />}
      <button type="button" disabled={!isOnline || isSyncing || !businessId} onClick={() => void run()}
        className="flex items-center gap-2 text-xs disabled:opacity-60" title="Sincronizar o reintentar cambios pendientes">
        {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : hasError ? <AlertCircle size={14} className="text-red-600" /> : <CheckCircle2 size={14} />}
        {isSyncing ? 'Sincronizando…' : !status ? 'Verificando…' : hasError ? `${status?.failed ?? 0} fallidos · Reintentar` : status?.pending ? `${status.pending} pendientes` : 'Sync OK'}
      </button>
      {hasError && <span role="status" className="text-xs text-red-600">Sincronización incompleta</span>}
    </div>
  </div>;
};
