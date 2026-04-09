/**
 * @module shared/utils/security.test
 *
 * Tests para utilidades de seguridad.
 * FASE 4.3: Seguridad y Validación - Sanitización de inputs
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeCantidad,
  sanitizeId,
  sanitizeDescription,
  getPermisosMedicamento,
  puedeDispensar,
  puedeEditarMedicamento,
  checkRateLimit,
  cleanupRateLimit,
  type RolUsuario,
} from './security';

// ── Tests de Sanitización ─────────────────────────────────────────────────

describe('sanitizeString', () => {
  it('elimina tags HTML', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert(&quot;xss&quot;)');
    expect(sanitizeString('<div>texto</div>')).toBe('texto');
    expect(sanitizeString('<p>parrafo</p>')).toBe('parrafo');
  });

  it('escapa caracteres especiales de HTML', () => {
    expect(sanitizeString('a < b')).toContain('&lt;');
    expect(sanitizeString('c > d')).toContain('&gt;');
    expect(sanitizeString('"comillas"')).toContain('&quot;');
    expect(sanitizeString("'apostrofe'")).toContain('&#x27;');
  });

  it('limita longitud a 1000 caracteres', () => {
    const long = 'a'.repeat(2000);
    const result = sanitizeString(long);
    expect(result.length).toBe(1000);
  });

  it('maneja valores nulos y undefined', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
  });

  it('convierte no-strings a strings', () => {
    expect(sanitizeString(123)).toBe('123');
    expect(sanitizeString(true)).toBe('true');
  });
});

describe('sanitizeCantidad', () => {
  it('convierte strings a números', () => {
    expect(sanitizeCantidad('10')).toBe(10);
    expect(sanitizeCantidad('5.5', 'VOLUMEN_ML')).toBe(5.5);
  });

  it('elimina caracteres no numéricos', () => {
    expect(sanitizeCantidad('10 abc')).toBe(10);
    expect(sanitizeCantidad('abc 20 xyz')).toBe(20);
  });

  it('solo enteros para UNIDAD', () => {
    expect(sanitizeCantidad(5.7, 'UNIDAD')).toBe(5);
    expect(sanitizeCantidad(10.1, 'UNIDAD')).toBe(10);
  });

  it('máximo 100 para PORCENTAJE', () => {
    expect(sanitizeCantidad(150, 'PORCENTAJE')).toBe(100);
    expect(sanitizeCantidad(80, 'PORCENTAJE')).toBe(80);
  });

  it('un decimal para VOLUMEN_ML y PESO_MG', () => {
    expect(sanitizeCantidad(5.55, 'VOLUMEN_ML')).toBe(5.6);
    expect(sanitizeCantidad(100.99, 'PESO_MG')).toBe(101);
  });

  it('convierte negativos a positivos', () => {
    expect(sanitizeCantidad(-10)).toBe(10);
    expect(sanitizeCantidad(-5.5, 'VOLUMEN_ML')).toBe(5.5);
  });

  it('maneja NaN e Infinity', () => {
    expect(sanitizeCantidad(NaN)).toBe(0);
    expect(sanitizeCantidad(Infinity)).toBe(0);
    expect(sanitizeCantidad(-Infinity)).toBe(0);
  });

  it('limita a valor máximo seguro', () => {
    expect(sanitizeCantidad(999999999)).toBe(999999);
  });
});

describe('sanitizeId', () => {
  it('acepta UUIDs válidos', () => {
    expect(sanitizeId('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(sanitizeId('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
  });

  it('acepta IDs alfanuméricos', () => {
    expect(sanitizeId('med-123')).toBe('med-123');
    expect(sanitizeId('user_456')).toBe('user_456');
  });

  it('rechaza IDs con caracteres especiales', () => {
    expect(sanitizeId('id<script>')).toBeNull();
    expect(sanitizeId('id;drop table;')).toBeNull();
  });

  it('rechaza strings vacíos', () => {
    expect(sanitizeId('')).toBeNull();
    expect(sanitizeId('   ')).toBeNull();
  });

  it('rechaza no-strings', () => {
    expect(sanitizeId(123)).toBeNull();
    expect(sanitizeId(null)).toBeNull();
  });

  it('limita longitud a 100 caracteres', () => {
    const long = 'a'.repeat(150);
    expect(sanitizeId(long)?.length).toBe(100);
  });
});

describe('sanitizeDescription', () => {
  it('elimina scripts', () => {
    expect(sanitizeDescription('<script>alert(1)</script>texto')).toBe('texto');
  });

  it('elimina event handlers', () => {
    expect(sanitizeDescription('<div onclick="alert(1)">texto</div>')).not.toContain('onclick');
  });

  it('elimina javascript: URLs', () => {
    expect(sanitizeDescription('<a href="javascript:alert(1)">link</a>')).not.toContain('javascript:');
  });

  it('escapa HTML restante', () => {
    expect(sanitizeDescription('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;/b&gt;');
  });

  it('limita a 5000 caracteres', () => {
    const long = 'a'.repeat(10000);
    expect(sanitizeDescription(long).length).toBe(5000);
  });
});

// ── Tests de Permisos ────────────────────────────────────────────────────

describe('getPermisosMedicamento', () => {
  it('admin tiene todos los permisos', () => {
    const permisos = getPermisosMedicamento('UNIDAD', 'admin');
    expect(permisos.puedeVer).toBe(true);
    expect(permisos.puedeDispensar).toBe(true);
    expect(permisos.puedeEditar).toBe(true);
    expect(permisos.puedeEliminar).toBe(true);
  });

  it('personal tiene permisos limitados', () => {
    const permisos = getPermisosMedicamento('UNIDAD', 'personal');
    expect(permisos.puedeVer).toBe(true);
    expect(permisos.puedeDispensar).toBe(true);
    expect(permisos.puedeEditar).toBe(false);
    expect(permisos.puedeEliminar).toBe(false);
  });

  it('cantidades máximas por tipo', () => {
    expect(getPermisosMedicamento('UNIDAD', 'personal').cantidadMaxima).toBe(50);
    expect(getPermisosMedicamento('VOLUMEN_ML', 'personal').cantidadMaxima).toBe(500);
    expect(getPermisosMedicamento('PESO_MG', 'personal').cantidadMaxima).toBe(1000);
    expect(getPermisosMedicamento('PORCENTAJE', 'personal').cantidadMaxima).toBe(100);
  });
});

describe('puedeDispensar', () => {
  it('permite dispensación dentro de límites', () => {
    const result = puedeDispensar('UNIDAD', 'personal', 10, 100);
    expect(result.permitido).toBe(true);
  });

  it('niega cuando excede cantidad máxima', () => {
    const result = puedeDispensar('UNIDAD', 'personal', 60, 100);
    expect(result.permitido).toBe(false);
    expect(result.razon).toContain('máximo permitido');
  });

  it('niega cuando stock insuficiente', () => {
    const result = puedeDispensar('UNIDAD', 'personal', 50, 30);
    expect(result.permitido).toBe(false);
    expect(result.razon).toBe('Stock insuficiente');
  });

  it('niega cuando no tiene permisos', () => {
    // Simular rol sin permisos (no hay en el sistema actual)
    // Este test verifica la estructura
    const result = puedeDispensar('VOLUMEN_ML', 'personal', 150, 200);
    expect(result.permitido).toBe(false);
    expect(result.razon).toContain('autorización');
  });

  it('requiere autorización para PORCENTAJE', () => {
    const result = puedeDispensar('PORCENTAJE', 'personal', 10, 100);
    expect(result.permitido).toBe(false);
    expect(result.razon).toContain('autorización');
  });
});

describe('puedeEditarMedicamento', () => {
  it('admin puede editar', () => {
    expect(puedeEditarMedicamento('UNIDAD', 'admin')).toBe(true);
    expect(puedeEditarMedicamento('VOLUMEN_ML', 'admin')).toBe(true);
  });

  it('personal no puede editar', () => {
    expect(puedeEditarMedicamento('UNIDAD', 'personal')).toBe(false);
    expect(puedeEditarMedicamento('PESO_MG', 'personal')).toBe(false);
  });
});

// ── Tests de Rate Limiting ─────────────────────────────────────────────────

describe('checkRateLimit', () => {
  it('permite requests dentro del límite', () => {
    const result = checkRateLimit('user-1', 10, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('niega requests que exceden el límite', () => {
    const key = 'user-limit';
    const max = 3;

    // Hacer 3 requests
    checkRateLimit(key, max, 60000);
    checkRateLimit(key, max, 60000);
    checkRateLimit(key, max, 60000);

    // El cuarto debe fallar
    const result = checkRateLimit(key, max, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('reinicia contador después de la ventana', async () => {
    const key = 'user-window';
    const window = 100; // 100ms para test rápido

    // Exceder límite
    checkRateLimit(key, 1, window);
    checkRateLimit(key, 1, window);

    // Esperar a que pase la ventana
    await new Promise(r => setTimeout(r, 150));

    // Debería permitir de nuevo
    const result = checkRateLimit(key, 1, window);
    expect(result.allowed).toBe(true);
  });

  it('different keys have separate limits', () => {
    const result1 = checkRateLimit('key-1', 1, 60000);
    const result2 = checkRateLimit('key-2', 1, 60000);

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result1.remaining).toBe(0);
    expect(result2.remaining).toBe(0);
  });
});

describe('cleanupRateLimit', () => {
  it('elimina entradas antiguas', async () => {
    const window = 100;

    // Crear entradas
    checkRateLimit('cleanup-1', 10, window);
    checkRateLimit('cleanup-2', 10, window);

    // Esperar
    await new Promise(r => setTimeout(r, 150));

    // Limpiar
    cleanupRateLimit(window);

    // Las entradas deberían poder usarse de nuevo
    const result1 = checkRateLimit('cleanup-1', 10, window);
    const result2 = checkRateLimit('cleanup-2', 10, window);

    expect(result1.remaining).toBe(9);
    expect(result2.remaining).toBe(9);
  });
});
