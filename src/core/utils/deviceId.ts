/**
 * Utilidad para generar y gestionar identificadores únicos de dispositivo
 * 
 * El deviceId se genera una vez y se persiste en localStorage
 * para identificar el dispositivo en sincronizaciones incrementales
 */

import { generateUUID } from '@/shared/utils/uuid';
import { logger } from '@/core/utils/logger';

const DEVICE_ID_KEY = 'topico_device_id';

/**
 * Obtiene o genera un deviceId único para este dispositivo
 * El deviceId se persiste en localStorage para mantener consistencia
 * 
 * CRITICAL FIX: Ahora maneja errores de localStorage (modo incógnito Safari, etc.)
 */
export function getDeviceId(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      // Generar nuevo deviceId usando la función compartida
      deviceId = `device-${generateUUID()}`;
      try {
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
      } catch {
        // Modo incógnito o storage bloqueado - usar ID de sesión temporal
        logger.warn('device.storage_unavailable', { area: 'device', operation: 'create' });
        // Generar nuevo ID cada vez (no persistente pero funcional)
        return deviceId;
      }
    }

    return deviceId;
  } catch {
    // Error accediendo a localStorage (ej: Safari incógnito)
    logger.warn('device.storage_failed', { area: 'device', operation: 'create' });
    return `device-${generateUUID()}`;
  }
}

/**
 * Resetea el deviceId (útil para testing)
 */
export function resetDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY);
  logger.info('device.reset', { area: 'device', operation: 'reset' });
}
