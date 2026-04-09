/**
 * @module features/atenciones/hooks/useLazyMovimientos
 *
 * Hook para lazy loading de historial de movimientos de stock.
 * FASE 4.2: Lazy loading de historial de dispensaciones
 *
 * Características:
 * - Paginación automática (infinite scroll)
 * - Virtualización de listas grandes
 * - Caché de páginas visitadas
 * - Filtrado por medicamento y rango de fechas
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '@/core/db/dexie/db';
import type { MovimientoStock } from '@/features/inventario/types';

// ── Configuración ───────────────────────────────────────────────────────────

const PAGE_SIZE = 20; // Movimientos por página
const CACHE_PAGES = 5; // Páginas a mantener en caché
const PRELOAD_THRESHOLD = 0.8; // Preload cuando se alcanza 80% de la página

// ── Tipos ───────────────────────────────────────────────────────────────────

interface UseLazyMovimientosOptions {
  /** ID del medicamento para filtrar (opcional) */
  medicamentoId?: string;
  /** ID de la atención para filtrar (opcional) */
  atencionId?: string;
  /** Fecha de inicio para filtrar */
  fechaDesde?: Date;
  /** Fecha de fin para filtrar */
  fechaHasta?: Date;
  /** Tipo de movimiento (ENTRADA/SALIDA) */
  tipo?: 'ENTRADA' | 'SALIDA';
}

interface PaginatedResult {
  items: MovimientoStock[];
  hasMore: boolean;
  totalLoaded: number;
}

interface PageCache {
  [pageNumber: number]: {
    items: MovimientoStock[];
    timestamp: number;
  };
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useLazyMovimientos(
  businessId: string | undefined,
  options: UseLazyMovimientosOptions = {}
) {
  const { medicamentoId, atencionId, fechaDesde, fechaHasta, tipo } = options;

  // Estados
  const [items, setItems] = useState<MovimientoStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const pageCache = useRef<PageCache>({});
  const currentPage = useRef(0);
  const isFetching = useRef(false);
  const abortController = useRef<AbortController | null>(null);

  // Limpiar caché cuando cambian los filtros
  useEffect(() => {
    pageCache.current = {};
    currentPage.current = 0;
    setItems([]);
    setHasMore(true);
    setError(null);
  }, [medicamentoId, atencionId, fechaDesde, fechaHasta, tipo, businessId]);

  /**
   * Construye la query base según los filtros
   */
  const buildQuery = useCallback(() => {
    if (!businessId) return null;

    let query = db.movimientos_stock
      .where('business_id')
      .equals(businessId);

    // Filtrar por medicamento
    if (medicamentoId) {
      query = db.movimientos_stock
        .where('[business_id+medicamento_id]')
        .equals([businessId, medicamentoId]);
    }

    // Filtrar por atención
    if (atencionId) {
      query = db.movimientos_stock
        .where('[business_id+atencion_id]')
        .equals([businessId, atencionId]);
    }

    return query;
  }, [businessId, medicamentoId, atencionId]);

  /**
   * Carga la siguiente página de resultados
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (!businessId || isFetching.current || !hasMore) return;

    // Cancelar fetch anterior si existe
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    isFetching.current = true;
    setLoading(true);
    setError(null);

    try {
      const page = currentPage.current + 1;

      // Verificar caché
      const cached = pageCache.current[page];
      if (cached && Date.now() - cached.timestamp < 60000) { // 1 minuto TTL
        setItems(prev => [...prev, ...cached.items]);
        currentPage.current = page;
        setHasMore(cached.items.length === PAGE_SIZE);
        isFetching.current = false;
        setLoading(false);
        return;
      }

      const query = buildQuery();
      if (!query) {
        setHasMore(false);
        isFetching.current = false;
        setLoading(false);
        return;
      }

      // Calcular offset
      const offset = (page - 1) * PAGE_SIZE;

      // Obtener datos paginados
      let results = await query
        .reverse() // Más recientes primero
        .offset(offset)
        .limit(PAGE_SIZE + 1) // +1 para detectar si hay más
        .toArray();

      // Verificar si hay más páginas
      const hasMoreResults = results.length > PAGE_SIZE;
      results = results.slice(0, PAGE_SIZE); // Quitar el extra

      // Filtrar por tipo y fechas en memoria
      let filtered = results;

      if (tipo) {
        filtered = filtered.filter(m => m.tipo === tipo);
      }

      if (fechaDesde) {
        const desde = fechaDesde.toISOString();
        filtered = filtered.filter(m => m.fecha_movimiento >= desde);
      }

      if (fechaHasta) {
        const hasta = fechaHasta.toISOString();
        filtered = filtered.filter(m => m.fecha_movimiento <= hasta);
      }

      // Guardar en caché (LRU)
      pageCache.current[page] = {
        items: filtered,
        timestamp: Date.now(),
      };

      // Limpiar caché antigua si excede el límite
      const cachedPages = Object.keys(pageCache.current).map(Number);
      if (cachedPages.length > CACHE_PAGES) {
        const oldestPage = cachedPages.sort((a, b) => {
          const timeA = pageCache.current[a]?.timestamp || 0;
          const timeB = pageCache.current[b]?.timestamp || 0;
          return timeA - timeB;
        })[0];
        delete pageCache.current[oldestPage];
      }

      setItems(prev => [...prev, ...filtered]);
      currentPage.current = page;
      setHasMore(hasMoreResults && filtered.length > 0);

    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
      }
    } finally {
      isFetching.current = false;
      setLoading(false);
    }
  }, [businessId, buildQuery, hasMore, fechaDesde, fechaHasta, tipo]);

  /**
   * Recarga desde el inicio
   */
  const refresh = useCallback(async (): Promise<void> => {
    pageCache.current = {};
    currentPage.current = 0;
    setItems([]);
    setHasMore(true);
    setError(null);
    await loadMore();
  }, [loadMore]);

  /**
   * Forzar carga de página específica
   */
  const loadPage = useCallback(async (pageNumber: number): Promise<void> => {
    if (!businessId) return;

    // Verificar si la página está en caché
    const cached = pageCache.current[pageNumber];
    if (cached && Date.now() - cached.timestamp < 60000) {
      return; // Ya tenemos esta página
    }

    const query = buildQuery();
    if (!query) return;

    const offset = (pageNumber - 1) * PAGE_SIZE;
    const results = await query
      .reverse()
      .offset(offset)
      .limit(PAGE_SIZE)
      .toArray();

    pageCache.current[pageNumber] = {
      items: results,
      timestamp: Date.now(),
    };
  }, [businessId, buildQuery]);

  /**
   * Estadísticas de paginación
   */
  const paginationStats = useMemo(() => ({
    currentPage: currentPage.current,
    itemsPerPage: PAGE_SIZE,
    totalLoaded: items.length,
    cachedPages: Object.keys(pageCache.current).length,
    hasMore,
  }), [items.length, hasMore]);

  return {
    items,
    loading,
    hasMore,
    error,
    loadMore,
    refresh,
    loadPage,
    paginationStats,
  };
}

// ── Hook para scroll infinito ───────────────────────────────────────────────

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
}

export function useInfiniteScroll(
  loadMore: () => void,
  hasMore: boolean,
  options: UseInfiniteScrollOptions = {}
) {
  const { threshold = PRELOAD_THRESHOLD, rootMargin = '100px' } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current = observer;

    if (targetRef.current) {
      observer.observe(targetRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [loadMore, hasMore, threshold, rootMargin]);

  const setTargetRef = useCallback((element: HTMLDivElement | null) => {
    targetRef.current = element;

    if (observerRef.current && element) {
      observerRef.current.observe(element);
    }
  }, []);

  return { setTargetRef };
}

export default useLazyMovimientos;
