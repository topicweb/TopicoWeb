/**
 * @module shared/utils/security
 *
 * Utilidades de seguridad para sanitización y validación.
 * FASE 4.3: Seguridad y Validación - Sanitización de inputs
 */

import type { TipoMedida } from '@/features/inventario/types';

// ── Constantes ─────────────────────────────────────────────────────────────

const MAX_INPUT_LENGTH = 1000;
const ALLOWED_CHARS = /^[a-zA-Z0-9\s\-_.,;:()\/\\%@#$&*+=[\]{}|!?~'`"<>]+$/;

// ── Sanitización de Inputs ─────────────────────────────────────────────────

/**
 * Sanitiza una cadena de texto para prevenir XSS e inyecciones.
 * - Elimina tags HTML
 * - Escapa caracteres especiales
 * - Limita longitud
 */
export function sanitizeString(input: unknown): string {
  if (input === null || input === undefined) return '';
  if (typeof input !== 'string') return String(input);

  // Limitar longitud
  let sanitized = input.slice(0, MAX_INPUT_LENGTH);

  // Eliminar tags HTML
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Escapar caracteres especiales de HTML
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  sanitized = sanitized.replace(/[&<>"'/]/g, char => htmlEscapes[char] || char);

  return sanitized;
}

/**
 * Sanitiza un número para cantidades.
 * - Asegura que sea un número válido
 * - Elimina decimales no deseados según tipo de medida
 * - Limita a rango seguro
 */
export function sanitizeCantidad(
  input: unknown,
  tipoMedida: TipoMedida = 'UNIDAD'
): number {
  // Convertir a número
  let num: number;

  if (typeof input === 'number') {
    num = input;
  } else if (typeof input === 'string') {
    // Eliminar caracteres no numéricos excepto punto decimal
    const cleaned = input.replace(/[^0-9.-]/g, '');
    num = parseFloat(cleaned);
  } else {
    num = 0;
  }

  // Verificar si es válido
  if (!Number.isFinite(num) || Number.isNaN(num)) {
    return 0;
  }

  // Asegurar que sea positivo
  num = Math.abs(num);

  // Truncar o redondear según tipo de medida
  switch (tipoMedida) {
    case 'UNIDAD':
      // Solo enteros para unidades
      num = Math.floor(num);
      break;
    case 'PORCENTAJE':
      // Máximo 100%
      num = Math.min(num, 100);
      num = Math.floor(num);
      break;
    case 'VOLUMEN_ML':
    case 'PESO_MG':
      // Permitir un decimal
      num = Math.round(num * 10) / 10;
      break;
  }

  // Limitar a valor máximo seguro (prevenir overflow)
  const MAX_SAFE = 999999;
  return Math.min(num, MAX_SAFE);
}

/**
 * Sanitiza un ID de base de datos.
 * - Solo permite UUIDs válidos o strings alfanuméricos
 */
export function sanitizeId(input: unknown): string | null {
  if (!input || typeof input !== 'string') return null;

  // Limpiar y validar
  const cleaned = input.trim().slice(0, 100);

  // UUID v4 pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // Validar como UUID o alfanumérico seguro
  if (uuidPattern.test(cleaned) || /^[a-zA-Z0-9_-]+$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

/**
 * Sanitiza descripciones de texto largo.
 * Permite más caracteres pero aún escapa HTML.
 */
export function sanitizeDescription(input: unknown): string {
  if (!input || typeof input !== 'string') return '';

  // Limitar longitud más generosa
  let sanitized = input.slice(0, 5000);

  // Eliminar scripts y event handlers
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*"[^"]*"/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*'[^']*'/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Escapar HTML restante
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
  };

  sanitized = sanitized.replace(/[&<>]/g, char => htmlEscapes[char] || char);

  return sanitized;
}

/**
 * Valida que un objeto no contenga propiedades inyectadas.
 * Útil para validar datos de formularios.
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  allowedFields: (keyof T)[]
): Partial<T> {
  const sanitized: Partial<T> = {};

  for (const key of allowedFields) {
    if (key in obj) {
      const value = obj[key];

      // Sanitizar según tipo
      if (typeof value === 'string') {
        (sanitized as Record<string, unknown>)[key as string] = sanitizeString(value);
      } else if (typeof value === 'number') {
        (sanitized as Record<string, unknown>)[key as string] = value;
      } else if (typeof value === 'boolean') {
        (sanitized as Record<string, unknown>)[key as string] = value;
      } else if (value === null || value === undefined) {
        (sanitized as Record<string, unknown>)[key as string] = value;
      }
      // Ignorar objetos y arrays (peligroso sanitizar automáticamente)
    }
  }

  return sanitized;
}

// ── Validación de Permisos ─────────────────────────────────────────────────

/**
 * Roles de usuario en el sistema
 */
export type RolUsuario = 'admin' | 'personal';

/**
 * Permisos para operaciones con medicamentos según tipo
 */
export interface PermisosMedicamento {
  puedeVer: boolean;
  puedeDispensar: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  cantidadMaxima: number;
  requiereAutorizacion: boolean | ((cantidad: number) => boolean);
}

/**
 * Configuración de permisos por tipo de medicamento y rol
 */
const PERMISOS_POR_TIPO: Record<TipoMedida, Record<RolUsuario, PermisosMedicamento>> = {
  UNIDAD: {
    admin: {
      puedeVer: true,
      puedeDispensar: true,
      puedeEditar: true,
      puedeEliminar: true,
      cantidadMaxima: 100,
      requiereAutorizacion: false,
    },
    personal: {
      puedeVer: true,
      puedeDispensar: true,
      puedeEditar: false,
      puedeEliminar: false,
      cantidadMaxima: 50,
      requiereAutorizacion: false,
    },
  },
  VOLUMEN_ML: {
    admin: {
      puedeVer: true,
      puedeDispensar: true,
      puedeEditar: true,
      puedeEliminar: true,
      cantidadMaxima: 1000,
      requiereAutorizacion: false,
    },
    personal: {
      puedeVer: true,
      puedeDispensar: true,
      puedeEditar: false,
      puedeEliminar: false,
      cantidadMaxima: 500,
      requiereAutorizacion: cantidad => cantidad > 100,
    },
  },
  PESO_MG: {
    admin: {
      puedeVer: true,
      puedeDispensar: true,
      puedeEditar: true,
      puedeEliminar: true,
      cantidadMaxima: 2000,
      requiereAutorizacion: false,
    },
    personal: {
      puedeVer: true,
      puedeDispensar: true,
      puedeEditar: false,
      puedeEliminar: false,
      cantidadMaxima: 1000,
      requiereAutorizacion: cantidad => cantidad > 250,
    },
  },
  PORCENTAJE: {
    admin: {
      puedeVer: true,
      puedeDispensar: true,
      puedeEditar: true,
      puedeEliminar: true,
      cantidadMaxima: 100,
      requiereAutorizacion: false,
    },
    personal: {
      puedeVer: true,
      puedeDispensar: true,
      puedeEditar: false,
      puedeEliminar: false,
      cantidadMaxima: 100,
      requiereAutorizacion: true, // Siempre requiere autorización porcentajes
    },
  },
};

/**
 * Obtiene permisos para un tipo de medicamento y rol
 */
export function getPermisosMedicamento(
  tipoMedida: TipoMedida,
  rol: RolUsuario
): PermisosMedicamento {
  return PERMISOS_POR_TIPO[tipoMedida][rol];
}

/**
 * Verifica si un usuario puede dispensar cierta cantidad
 */
export function puedeDispensar(
  tipoMedida: TipoMedida,
  rol: RolUsuario,
  cantidad: number,
  stockDisponible: number
): { permitido: boolean; razon?: string } {
  const permisos = getPermisosMedicamento(tipoMedida, rol);

  // Verificar si puede dispensar
  if (!permisos.puedeDispensar) {
    return { permitido: false, razon: 'No tiene permisos para dispensar medicamentos' };
  }

  // Verificar cantidad máxima
  if (cantidad > permisos.cantidadMaxima) {
    return {
      permitido: false,
      razon: `Cantidad excede el máximo permitido (${permisos.cantidadMaxima}) para su rol`,
    };
  }

  // Verificar stock
  if (cantidad > stockDisponible) {
    return { permitido: false, razon: 'Stock insuficiente' };
  }

  // Verificar si requiere autorización
  const requiereAuth = typeof permisos.requiereAutorizacion === 'function'
    ? permisos.requiereAutorizacion(cantidad)
    : permisos.requiereAutorizacion;

  if (requiereAuth) {
    return {
      permitido: false,
      razon: 'Esta cantidad requiere autorización de un administrador',
    };
  }

  return { permitido: true };
}

/**
 * Valida que un usuario tenga permiso para editar un medicamento
 */
export function puedeEditarMedicamento(
  tipoMedida: TipoMedida,
  rol: RolUsuario
): boolean {
  return getPermisosMedicamento(tipoMedida, rol).puedeEditar;
}

// ── Rate Limiting ──────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  timestamp: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Verifica rate limiting para operaciones.
 * @param key Identificador único (ej: userId + operación)
 * @param maxRequests Máximo de requests permitidos
 * @param windowMs Ventana de tiempo en milisegundos
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.timestamp > windowMs) {
    // Nueva ventana
    rateLimitMap.set(key, { count: 1, timestamp: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  // Ventana existente
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.timestamp + windowMs,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.timestamp + windowMs,
  };
}

/**
 * Limpia entradas antiguas del rate limit
 */
export function cleanupRateLimit(windowMs: number = 60000): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now - entry.timestamp > windowMs) {
      rateLimitMap.delete(key);
    }
  }
}
