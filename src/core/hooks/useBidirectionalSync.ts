import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/core/providers/AuthProvider';
import { useNetwork } from '@/core/providers/NetworkProvider';
import { syncService } from '@/core/db/sync';
import { getDeviceId } from '@/core/utils/deviceId';
import { logger } from '@/core/utils/logger';

export function useBidirectionalSync() {
  const { user, businessId, perfil } = useAuth();
  const { isOnline } = useNetwork();
  const [isSyncing, setIsSyncing] = useState(false);
  const syncUserId = user?.id;
  const eligible = !!syncUserId && perfil?.id === syncUserId && !!perfil.activo && !perfil.deleted_at;
  const context = useMemo(() => syncUserId && businessId && eligible
    ? { userId: syncUserId, businessId, deviceId: getDeviceId() } : null, [syncUserId, businessId, eligible]);
  useEffect(() => {
    if (!context || !isOnline) return;
    let active = true;
    const run = async () => {
      if (!active) return;
      setIsSyncing(true);
      try { await syncService.fullSync(context); }
      catch { if (active) logger.error('sync.request_failed', { area: 'sync', operation: 'pull' }); }
      finally { if (active) setIsSyncing(false); }
    };
    const timer = window.setTimeout(run, 0);
    window.addEventListener('online', run);
    return () => { active = false; window.clearTimeout(timer); window.removeEventListener('online', run); };
  }, [context, isOnline]);
  const forceSync = useCallback(async () => {
    if (!context || !isOnline) return;
    setIsSyncing(true);
    try { await syncService.fullSync(context); }
    finally { setIsSyncing(false); }
  }, [context, isOnline]);
  const triggerPush = useCallback(async () => {
    if (context && isOnline) await syncService.pushToSupabase(context);
  }, [context, isOnline]);
  const retryFailed = useCallback(async () => {
    if (!context || !isOnline) return;
    setIsSyncing(true);
    try { await syncService.retryFailed(context); }
    finally { setIsSyncing(false); }
  }, [context, isOnline]);
  return { isSyncing, forceSync, triggerPush, retryFailed };
}
