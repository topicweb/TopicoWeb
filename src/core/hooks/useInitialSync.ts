import { useSimpleSync } from './useSimpleSync';

/**
 * Hook simple para sincronización inicial.
 * El sync real se maneja en useSimpleSync cuando hay conexión.
 */
export function useInitialSync(enabled: boolean) {
  useSimpleSync(enabled);
}
