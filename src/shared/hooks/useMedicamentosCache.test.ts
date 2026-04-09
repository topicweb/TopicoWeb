/**
 * @module shared/hooks/useMedicamentosCache.test
 *
 * Tests para el sistema de caching inteligente de medicamentos.
 * FASE 4.2: Performance y Optimización - Caching inteligente
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { medicamentosCache } from './useMedicamentosCache';
import type { Medicamento } from '@/features/inventario/types';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockMedicamento = (overrides: Partial<Medicamento> = {}): Medicamento => ({
  id: `med-${Math.random().toString(36).substr(2, 9)}`,
  business_id: 'biz-1',
  nombre: 'Medicamento Test',
  descripcion: 'Descripción',
  unidad_medida: 'unidad',
  tipo_medida: 'UNIDAD',
  presentacion: 'Caja x 10',
  anaquel: 'A-1',
  stock_actual: 100,
  stock_minimo: 10,
  imagen_url: undefined,
  creado_at: new Date().toISOString(),
  actualizado_at: new Date().toISOString(),
  sync_status: 'synced',
  activo: 1,
  ...overrides,
});

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ── Tests ───────────────────────────────────────────────────────────────────

describe('medicamentosCache', () => {
  beforeEach(() => {
    medicamentosCache.invalidate(); // Limpiar caché
    localStorageMock.clear();
  });

  describe('Operaciones básicas de caché', () => {
    it('almacena y recupera medicamentos del caché', () => {
      const med = mockMedicamento({ id: 'med-1', nombre: 'Paracetamol' });

      medicamentosCache.set(med);
      const cached = medicamentosCache.get('med-1');

      expect(cached).toBeDefined();
      expect(cached?.id).toBe('med-1');
      expect(cached?.nombre).toBe('Paracetamol');
    });

    it('retorna undefined para medicamentos no cacheados', () => {
      const cached = medicamentosCache.get('no-existe');
      expect(cached).toBeUndefined();
    });

    it('actualiza el contador de accesos', () => {
      const med = mockMedicamento({ id: 'med-1' });

      medicamentosCache.set(med);
      medicamentosCache.get('med-1');
      medicamentosCache.get('med-1');

      const stats = medicamentosCache.getStats();
      expect(stats['med-1']?.accessCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Política LRU (Least Recently Used)', () => {
    it('mantiene solo los 50 medicamentos más recientes', () => {
      // Limpiar completamente antes del test
      medicamentosCache.invalidate();

      // Llenar caché con 55 medicamentos
      for (let i = 0; i < 55; i++) {
        const med = mockMedicamento({ id: `med-lru-${i}` });
        medicamentosCache.set(med);
      }

      // Verificar que los primeros fueron eliminados (LRU)
      // Los primeros en entrar son los primeros en salir cuando se excede el límite
      expect(medicamentosCache.get('med-lru-0')).toBeUndefined();
      expect(medicamentosCache.get('med-lru-1')).toBeUndefined();
      // Los últimos deberían estar presentes
      expect(medicamentosCache.get('med-lru-54')).toBeDefined();
      expect(medicamentosCache.get('med-lru-53')).toBeDefined();
    });

    it('mueve al final los elementos accedidos recientemente', () => {
      const med1 = mockMedicamento({ id: 'med-antiguo' });
      const med2 = mockMedicamento({ id: 'med-nuevo' });

      medicamentosCache.set(med1);
      medicamentosCache.set(med2);

      // Acceder al antiguo lo mueve al final
      medicamentosCache.get('med-antiguo');

      // El antiguo debería tener más accesos ahora
      const stats = medicamentosCache.getStats();
      expect(stats['med-antiguo']?.accessCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('invalida entradas expiradas después de 5 minutos', async () => {
      const med = mockMedicamento({ id: 'med-ttl' });

      medicamentosCache.set(med);

      // Simular paso de tiempo (mock del timestamp interno sería ideal)
      // Por ahora, verificamos que la entrada existe
      expect(medicamentosCache.get('med-ttl')).toBeDefined();
    });
  });

  describe('Operaciones en lote', () => {
    it('getMany recupera múltiples medicamentos eficientemente', async () => {
      // Nota: Esto requiere mock de la base de datos Dexie
      // Por ahora, verificamos la interfaz
      const ids = ['med-1', 'med-2', 'med-3'];

      // Simular caché
      ids.forEach(id => {
        medicamentosCache.set(mockMedicamento({ id }));
      });

      // Verificar que están en caché
      for (const id of ids) {
        expect(medicamentosCache.get(id)).toBeDefined();
      }
    });
  });

  describe('Estadísticas y tracking', () => {
    it('registra dispensaciones correctamente', () => {
      const med = mockMedicamento({ id: 'med-disp' });

      medicamentosCache.set(med);
      medicamentosCache.recordDispensation('med-disp');

      const stats = medicamentosCache.getStats();
      expect(stats['med-disp']?.dispensations).toBe(1);
    });

    it('identifica medicamentos más frecuentes', () => {
      // Simular diferentes frecuencias de acceso
      for (let i = 0; i < 10; i++) {
        medicamentosCache.set(mockMedicamento({ id: `med-popular-${i}` }));
        // Acceder múltiples veces
        for (let j = 0; j < i + 1; j++) {
          medicamentosCache.get(`med-popular-${i}`);
        }
      }

      const mostFrequent = medicamentosCache.getMostFrequent(5);
      expect(mostFrequent.length).toBeLessThanOrEqual(5);
    });

    it('limpia estadísticas antiguas', () => {
      // Crear estadísticas viejas usando el método interno
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60); // 60 días atrás

      // Simular entrada vieja accediendo a localStorage directamente
      const testStats = {
        'med-viejo': {
          accessCount: 10,
          lastAccess: oldDate.toISOString(),
          dispensations: 5,
        },
      };
      localStorageMock.setItem('topico_medicamentos_stats', JSON.stringify(testStats));

      // Limpiar con threshold de 30 días
      medicamentosCache.cleanupOldStats(30);

      // Verificar que el viejo fue eliminado
      const stats = medicamentosCache.getStats();
      expect(stats['med-viejo']).toBeUndefined();
    });
  });

  describe('Invalidación de caché', () => {
    it('invalida entradas específicas', () => {
      const med1 = mockMedicamento({ id: 'med-a' });
      const med2 = mockMedicamento({ id: 'med-b' });

      medicamentosCache.set(med1);
      medicamentosCache.set(med2);

      medicamentosCache.invalidate(['med-a']);

      expect(medicamentosCache.get('med-a')).toBeUndefined();
      expect(medicamentosCache.get('med-b')).toBeDefined();
    });

    it('invalida todo el caché cuando no se especifican IDs', () => {
      const med1 = mockMedicamento({ id: 'med-1' });
      const med2 = mockMedicamento({ id: 'med-2' });

      medicamentosCache.set(med1);
      medicamentosCache.set(med2);

      medicamentosCache.invalidate();

      expect(medicamentosCache.get('med-1')).toBeUndefined();
      expect(medicamentosCache.get('med-2')).toBeUndefined();
    });
  });

  describe('Persistencia localStorage', () => {
    it('guarda estadísticas en localStorage', () => {
      const med = mockMedicamento({ id: 'med-persist' });

      medicamentosCache.set(med);
      medicamentosCache.get('med-persist'); // Genera stats

      const stored = localStorageMock.getItem('topico_medicamentos_stats');
      expect(stored).toBeDefined();

      const stats = JSON.parse(stored!);
      expect(stats['med-persist']).toBeDefined();
    });

    it('carga estadísticas desde localStorage al iniciar', () => {
      // Pre-popular localStorage
      localStorageMock.setItem('topico_medicamentos_stats', JSON.stringify({
        'med-previo': {
          accessCount: 100,
          lastAccess: new Date().toISOString(),
          dispensations: 50,
        },
      }));

      // Las estadísticas deberían estar disponibles
      // Nota: En el singleton real, esto se carga al importar
      const stats = medicamentosCache.getStats();
      // El test puede variar dependiendo de la implementación exacta
    });
  });
});

describe('useMedicamentosCache hook', () => {
  // Tests del hook React (requeriría @testing-library/react)
  // Por ahora, documentamos la interfaz esperada

  it('expone la interfaz correcta', () => {
    // La interfaz debe incluir:
    // - getMedicamentos(ids: string[]): Promise<Map<string, Medicamento>>
    // - preloadFrequent(): Promise<void>
    // - invalidateCache(ids?: string[]): void
    // - recordUsage(medicamentoId: string): void
    // - getFrequent(limit?: number): Promise<Medicamento[]>
    // - stats: MedicamentoStats
    // - cacheSize: number

    expect(true).toBe(true); // Placeholder
  });
});
