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
import { syncService } from '@/core/db/sync';
import { supabase } from '@/core/db/supabase';

export function useBidirectionalSync() {
  const { user, businessId } = useAuth();
  const { isOnline } = useNetwork();
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgress = useRef(false);
  // CRITICAL FIX: Usar ref para rastrear PULL inicial por businessId
  // Esto permite que el PULL se ejecute para cada usuario diferente
  const initialPullByBusinessId = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Solo sincronizar si hay usuario, businessId y conexión
    if (!user || !businessId || !isOnline) return;

    const sync = async () => {
      if (syncInProgress.current) return;

      syncInProgress.current = true;
      setIsSyncing(true);

      try {
        // PULL inicial solo si este businessId no ha sido sincronizado antes
        if (!initialPullByBusinessId.current.has(businessId)) {
          await syncService.pullFromSupabase(businessId);
          initialPullByBusinessId.current.add(businessId);
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

    // Sincronizar periódicamente cada 5 minutos para no consumir recursos excesivos
    const interval = setInterval(sync, 300000);

    return () => {
      clearInterval(interval);
      syncInProgress.current = false;
    };
  }, [user, businessId, isOnline]);

  // Sincronizar cuando vuelve la conexión
  useEffect(() => {
    if (!isOnline || !user || !businessId) return;

    const handleOnline = async () => {
      console.log('[useBidirectionalSync] 🟢 Evento online detectado - esperando conexión real...');

      if (syncInProgress.current) {
        console.log('[useBidirectionalSync] ⚠️ Sync ya en progreso, omitiendo');
        return;
      }

      // CRITICAL FIX: Esperar 2 segundos para que la conexión real se establezca
      // El evento 'online' se dispara antes de que la conexión esté realmente disponible
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verificar conexión real haciendo un ping a Supabase
      try {
        const { error } = await supabase.from('instituciones').select('id').limit(1);
        if (error) {
          console.log('[useBidirectionalSync] ⚠️ Conexión a Supabase no disponible aún, reintentando en 3s...');
          setTimeout(handleOnline, 3000);
          return;
        }
      } catch (err) {
        console.log('[useBidirectionalSync] ⚠️ Error verificando conexión, reintentando en 3s...');
        setTimeout(handleOnline, 3000);
        return;
      }

      console.log('[useBidirectionalSync] ✅ Conexión verificada - iniciando sync');
      syncInProgress.current = true;
      setIsSyncing(true);

      try {
        console.log('[useBidirectionalSync] 📤 Iniciando fullSync para businessId:', businessId);
        await syncService.fullSync(businessId);
        console.log('[useBidirectionalSync] ✅ fullSync completado');
      } catch (error) {
        console.error('[useBidirectionalSync] ❌ Error al volver online:', error);
        // Reintentar después de 5 segundos si falla
        setTimeout(handleOnline, 5000);
      } finally {
        setIsSyncing(false);
        syncInProgress.current = false;
      }
    };

    console.log('[useBidirectionalSync] 🎧 Registrando listener para evento online');
    window.addEventListener('online', handleOnline);

    return () => {
      console.log('[useBidirectionalSync] 🚫 Removiendo listener para evento online');
      window.removeEventListener('online', handleOnline);
    };
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

  // Trigger PUSH inmediato después de cambios locales
  const triggerPush = async () => {
    if (!isOnline) return;
    try {
      await syncService.pushToSupabase();
    } catch (error) {
      console.error('[useBidirectionalSync] Error en triggerPush:', error);
    }
  };

  return {
    isSyncing,
    forceSync,
    triggerPush,
  };
}
