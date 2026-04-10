/**
 * Hook de Sincronización Bidireccional
 * 
 * Funcionalidades:
 * - PULL inicial al primer login
 * - PUSH automático de cambios locales
 * - Realtime subscriptions para sync en tiempo real
 * - Resolución de conflictos automática
 */
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/core/providers/AuthProvider';
import { useNetwork } from '@/core/providers/NetworkProvider';
import { syncService } from '@/core/services/syncService';

export function useBidirectionalSync() {
  const { user, businessId } = useAuth();
  const { isOnline } = useNetwork();
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasInitialPull, setHasInitialPull] = useState(false);
  const syncInProgress = useRef(false);

  useEffect(() => {
    // Solo sincronizar si hay usuario, businessId y conexión
    if (!user || !businessId || !isOnline) return;

    const sync = async () => {
      if (syncInProgress.current || isSyncing) return;

      syncInProgress.current = true;
      setIsSyncing(true);

      try {
        // PULL inicial si es el primer login
        if (!hasInitialPull) {
          console.log('[useBidirectionalSync] Ejecutando PULL inicial...');
          await syncService.pullFromSupabase(businessId);
          setHasInitialPull(true);
        }

        // PUSH cambios locales
        await syncService.pushToSupabase();
      } catch (error) {
        console.error('[useBidirectionalSync] Error en sincronización:', error);
      } finally {
        setIsSyncing(false);
        syncInProgress.current = false;
      }
    };

    sync();

    // Sincronizar periódicamente cada 30 segundos
    const interval = setInterval(sync, 30000);

    return () => {
      clearInterval(interval);
      syncInProgress.current = false;
    };
  }, [user, businessId, isOnline, hasInitialPull, isSyncing]);

  // Sincronizar cuando vuelve la conexión
  useEffect(() => {
    if (!isOnline || !user || !businessId) return;

    const handleOnline = async () => {
      if (syncInProgress.current) return;

      syncInProgress.current = true;
      setIsSyncing(true);

      try {
        await syncService.fullSync(businessId);
      } catch (error) {
        console.error('[useBidirectionalSync] Error al volver online:', error);
      } finally {
        setIsSyncing(false);
        syncInProgress.current = false;
      }
    };

    window.addEventListener('online', handleOnline);

    return () => window.removeEventListener('online', handleOnline);
  }, [isOnline, user, businessId]);

  // Forzar sincronización manual
  const forceSync = async () => {
    if (!businessId) return;

    setIsSyncing(true);
    try {
      await syncService.fullSync(businessId);
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    hasInitialPull,
    forceSync,
  };
}
