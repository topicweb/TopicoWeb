import { useEffect } from 'react';
import { syncService } from '@/core/services/syncService';

/**
 * Hook to trigger initial synchronization and listen for realtime changes.
 * Should be called when the user is authenticated and has a businessId.
 */
export function useInitialSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    // Trigger initial sync
    syncService.sync().catch((err) => {
      console.error('Failed to run initial sync:', err);
    });

    // Start listening to realtime changes from Supabase
    syncService.listenToChanges();
  }, [enabled]);
}
