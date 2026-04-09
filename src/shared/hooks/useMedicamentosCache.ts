/**
 * @module shared/hooks/useMedicamentosCache
 *
 * Hook de caching inteligente para medicamentos frecuentes.
 * FASE 4.2: Caching inteligente de medicamentos frecuentes
 *
 * Características:
 * - LRU Cache en memoria para medicamentos más usados
 * - Persistencia de estadísticas de uso en localStorage
 * - Precarga predictiva basada en historial
 * - Invalidación selectiva por sync_status
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '@/core/db/dexie/db';
import type { Medicamento } from '@/features/inventario/types';

// ── Configuración ───────────────────────────────────────────────────────────

const CACHE_SIZE = 50; // Máximo de medicamentos en caché
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const STATS_KEY = 'topico_medicamentos_stats';

// ── Tipos ───────────────────────────────────────────────────────────────────

interface CacheEntry {
  medicamento: Medicamento;
  timestamp: number;
  accessCount: number;
}

interface MedicamentoStats {
  [medicamentoId: string]: {
    accessCount: number;
    lastAccess: string;
    dispensations: number;
  };
}

// ── LRU Cache Implementation ────────────────────────────────────────────────

class MedicamentosCache {
  private cache = new Map<string, CacheEntry>();
  private stats: MedicamentoStats = {};

  constructor() {
    this.loadStats();
  }

  /**
   * Obtiene un medicamento del caché, actualizando su posición LRU
   */
  get(id: string): Medicamento | undefined {
    const entry = this.cache.get(id);
    if (!entry) return undefined;

    // Verificar TTL
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(id);
      return undefined;
    }

    // Actualizar estadísticas
    entry.accessCount++;
    this.updateStats(id, 'access');

    // Mover al final (más reciente)
    this.cache.delete(id);
    this.cache.set(id, entry);

    return entry.medicamento;
  }

  /**
   * Agrega un medicamento al caché
   */
  set(medicamento: Medicamento): void {
    // Si está lleno, eliminar el más antiguo
    if (this.cache.size >= CACHE_SIZE && !this.cache.has(medicamento.id)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(medicamento.id, {
      medicamento,
      timestamp: Date.now(),
      accessCount: 1,
    });

    this.updateStats(medicamento.id, 'access');
  }

  /**
   * Obtiene múltiples medicamentos, usando caché o DB
   */
  async getMany(ids: string[]): Promise<Map<string, Medicamento>> {
    const result = new Map<string, Medicamento>();
    const missingIds: string[] = [];

    // Primero buscar en caché
    for (const id of ids) {
      const cached = this.get(id);
      if (cached) {
        result.set(id, cached);
      } else {
        missingIds.push(id);
      }
    }

    // Cargar los faltantes de la DB
    if (missingIds.length > 0) {
      const fromDb = await db.medicamentos.where('id').anyOf(missingIds).toArray();
      for (const med of fromDb) {
        this.set(med);
        result.set(med.id, med);
      }
    }

    return result;
  }

  /**
   * Invalida entradas específicas o todo el caché
   */
  invalidate(ids?: string[]): void {
    if (ids) {
      for (const id of ids) {
        this.cache.delete(id);
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Obtiene los medicamentos más frecuentes según estadísticas
   */
  getMostFrequent(limit: number = 10): string[] {
    return Object.entries(this.stats)
      .sort((a, b) => b[1].accessCount - a[1].accessCount)
      .slice(0, limit)
      .map(([id]) => id);
  }

  /**
   * Precarga medicamentos frecuentes en el caché
   */
  async preloadFrequent(): Promise<void> {
    const frequentIds = this.getMostFrequent(CACHE_SIZE / 2);
    if (frequentIds.length === 0) return;

    const cachedIds = new Set(this.cache.keys());
    const toLoad = frequentIds.filter(id => !cachedIds.has(id));

    if (toLoad.length === 0) return;

    const medicamentos = await db.medicamentos.where('id').anyOf(toLoad).toArray();
    for (const med of medicamentos) {
      this.set(med);
    }
  }

  /**
   * Registra una dispensación para análisis predictivo
   */
  recordDispensation(medicamentoId: string): void {
    this.updateStats(medicamentoId, 'dispensation');
  }

  /**
   * Carga estadísticas desde localStorage
   */
  private loadStats(): void {
    try {
      const stored = localStorage.getItem(STATS_KEY);
      if (stored) {
        this.stats = JSON.parse(stored);
      }
    } catch {
      this.stats = {};
    }
  }

  /**
   * Guarda estadísticas en localStorage
   */
  private saveStats(): void {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(this.stats));
    } catch {
      // Ignorar errores de localStorage
    }
  }

  /**
   * Actualiza estadísticas de uso
   */
  private updateStats(medicamentoId: string, type: 'access' | 'dispensation'): void {
    const stats = this.stats[medicamentoId] || {
      accessCount: 0,
      lastAccess: new Date().toISOString(),
      dispensations: 0,
    };

    stats.accessCount++;
    stats.lastAccess = new Date().toISOString();

    if (type === 'dispensation') {
      stats.dispensations++;
    }

    this.stats[medicamentoId] = stats;
    this.saveStats();
  }

  /**
   * Obtiene estadísticas actuales
   */
  getStats(): MedicamentoStats {
    return { ...this.stats };
  }

  /**
   * Limpia estadísticas antiguas (> 30 días)
   */
  cleanupOldStats(days: number = 30): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    for (const [id, stats] of Object.entries(this.stats)) {
      if (new Date(stats.lastAccess) < cutoff) {
        delete this.stats[id];
      }
    }

    this.saveStats();
  }
}

// Singleton global
const globalCache = new MedicamentosCache();

// ── React Hook ──────────────────────────────────────────────────────────────

interface UseMedicamentosCacheReturn {
  /** Obtiene medicamentos por ID (con caché) */
  getMedicamentos: (ids: string[]) => Promise<Map<string, Medicamento>>;
  /** Precarga medicamentos frecuentes */
  preloadFrequent: () => Promise<void>;
  /** Invalida caché específico o completo */
  invalidateCache: (ids?: string[]) => void;
  /** Registra uso de un medicamento */
  recordUsage: (medicamentoId: string) => void;
  /** Obtiene medicamentos más frecuentes */
  getFrequent: (limit?: number) => Promise<Medicamento[]>;
  /** Estadísticas de uso */
  stats: MedicamentoStats;
  /** Tamaño actual del caché */
  cacheSize: number;
}

export function useMedicamentosCache(): UseMedicamentosCacheReturn {
  const [, forceUpdate] = useState({});
  const cacheRef = useRef(globalCache);

  // Precargar al montar
  useEffect(() => {
    cacheRef.current.preloadFrequent();
  }, []);

  const getMedicamentos = useCallback(async (ids: string[]) => {
    const result = await cacheRef.current.getMany(ids);
    forceUpdate({});
    return result;
  }, []);

  const preloadFrequent = useCallback(async () => {
    await cacheRef.current.preloadFrequent();
    forceUpdate({});
  }, []);

  const invalidateCache = useCallback((ids?: string[]) => {
    cacheRef.current.invalidate(ids);
    forceUpdate({});
  }, []);

  const recordUsage = useCallback((medicamentoId: string) => {
    cacheRef.current.recordDispensation(medicamentoId);
    forceUpdate({});
  }, []);

  const getFrequent = useCallback(async (limit?: number) => {
    const ids = cacheRef.current.getMostFrequent(limit);
    const map = await cacheRef.current.getMany(ids);
    return Array.from(map.values());
  }, []);

  return {
    getMedicamentos,
    preloadFrequent,
    invalidateCache,
    recordUsage,
    getFrequent,
    stats: cacheRef.current.getStats(),
    cacheSize: globalCache['cache'].size,
  };
}

export { globalCache as medicamentosCache };
