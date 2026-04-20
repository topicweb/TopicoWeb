/**
 * Utilidad para generar y gestionar identificadores únicos de dispositivo
 * 
 * El deviceId se genera una vez y se persiste en localStorage
 * para identificar el dispositivo en sincronizaciones incrementales
 */

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
      // Generar nuevo deviceId
      deviceId = generateDeviceId();
      try {
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
      } catch (storageError) {
        // Modo incógnito o storage bloqueado - usar ID de sesión temporal
        console.warn('[DeviceId] localStorage no disponible, usando sesión temporal');
        // Generar nuevo ID cada vez (no persistente pero funcional)
        return deviceId;
      }
    }

    return deviceId;
  } catch (error) {
    // Error accediendo a localStorage (ej: Safari incógnito)
    console.warn('[DeviceId] Error accediendo a localStorage, generando ID temporal:', error);
    return generateDeviceId();
  }
}

/**
 * Genera un deviceId único usando crypto.randomUUID o fallback
 */
function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `device-${crypto.randomUUID()}`;
  }
  // Fallback simple
  return `device-${'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  })}`;
}

/**
 * Resetea el deviceId (útil para testing)
 */
export function resetDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY);
  console.log('[DeviceId] deviceId reseteado');
}
