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
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    // Generar nuevo deviceId
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    console.log('[DeviceId] Nuevo deviceId generado:', deviceId);
  } else {
    console.log('[DeviceId] deviceId existente:', deviceId);
  }
  
  return deviceId;
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
