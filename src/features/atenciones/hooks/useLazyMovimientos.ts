import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '@/core/db/dexie/db';
import type { MovimientoStock } from '@/features/inventario/types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const PAGE_SIZE = 20;
const CACHE_PAGES = 5;
const CACHE_TTL = 60000;
const PRELOAD_THRESHOLD = 0.8;

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface UseLazyMovimientosOptions {
  medicamentoId?: string;
  atencionId?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  tipo?: 'ENTRADA' | 'SALIDA';
}

interface PageCache {
  [pageNumber: number]: {
    items: MovimientoStock[];
    timestamp: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function useLazyMovimientos(businessId: string | undefined, options: UseLazyMovimientosOptions = {}) {
  const { medicamentoId, atencionId, fechaDesde, fechaHasta, tipo } = options;

  const [items, setItems] = useState<MovimientoStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const pageCache = useRef<PageCache>({});
  const currentPage = useRef(0);
  const isFetching = useRef(false);

  useEffect(() => {
    pageCache.current = {};
    currentPage.current = 0;
    setItems([]);
    setHasMore(true);
    setError(null);
  }, [medicamentoId, atencionId, fechaDesde, fechaHasta, tipo, businessId]);

  // CRITICAL FIX: Limpiar cache al desmontar para evitar memory leak
  useEffect(() => {
    return () => {
      pageCache.current = {};
    };
  }, []);

  const getQuery = useCallback(() => {
    if (!businessId) return null;

    if (medicamentoId) {
      return db.movimientos_stock.where('[business_id+medicamento_id]').equals([businessId, medicamentoId]);
    }
    if (atencionId) {
      return db.movimientos_stock.where('[business_id+atencion_id]').equals([businessId, atencionId]);
    }
    return db.movimientos_stock.where('business_id').equals(businessId);
  }, [businessId, medicamentoId, atencionId]);

  const filterResults = useCallback(
    (results: MovimientoStock[]) => {
      let filtered = results;
      if (tipo) filtered = filtered.filter((m) => m.tipo === tipo);
      if (fechaDesde) filtered = filtered.filter((m) => m.fecha_movimiento >= fechaDesde.toISOString());
      if (fechaHasta) filtered = filtered.filter((m) => m.fecha_movimiento <= fechaHasta.toISOString());
      return filtered;
    },
    [tipo, fechaDesde, fechaHasta]
  );

  const loadMore = useCallback(async () => {
    if (!businessId || isFetching.current || !hasMore) return;

    isFetching.current = true;
    setLoading(true);
    setError(null);

    try {
      const page = currentPage.current + 1;
      const cached = pageCache.current[page];

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setItems((prev) => [...prev, ...cached.items]);
        currentPage.current = page;
        setHasMore(cached.items.length === PAGE_SIZE);
        return;
      }

      const query = getQuery();
      if (!query) {
        setHasMore(false);
        return;
      }

      const offset = (page - 1) * PAGE_SIZE;
      let results = await query.reverse().offset(offset).limit(PAGE_SIZE + 1).toArray();

      const hasMoreResults = results.length > PAGE_SIZE;
      results = results.slice(0, PAGE_SIZE);

      const filtered = filterResults(results);

      pageCache.current[page] = { items: filtered, timestamp: Date.now() };

      const cachedPages = Object.keys(pageCache.current).map(Number);
      if (cachedPages.length > CACHE_PAGES) {
        const oldest = cachedPages.sort((a, b) => pageCache.current[a].timestamp - pageCache.current[b].timestamp)[0];
        delete pageCache.current[oldest];
      }

      setItems((prev) => [...prev, ...filtered]);
      currentPage.current = page;
      setHasMore(hasMoreResults && filtered.length > 0);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') setError(err);
    } finally {
      isFetching.current = false;
      setLoading(false);
    }
  }, [businessId, hasMore, getQuery, filterResults]);

  const refresh = useCallback(async () => {
    pageCache.current = {};
    currentPage.current = 0;
    setItems([]);
    setHasMore(true);
    setError(null);
    await loadMore();
  }, [loadMore]);

  const paginationStats = useMemo(
    () => ({
      currentPage: currentPage.current,
      itemsPerPage: PAGE_SIZE,
      totalLoaded: items.length,
      cachedPages: Object.keys(pageCache.current).length,
      hasMore,
    }),
    [items.length, hasMore]
  );

  return { items, loading, hasMore, error, loadMore, refresh, paginationStats };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: SCROLL INFINITO
// ═══════════════════════════════════════════════════════════════════════════════

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
      ([entry]) => entry.isIntersecting && loadMore(),
      { threshold, rootMargin }
    );

    observerRef.current = observer;
    if (targetRef.current) observer.observe(targetRef.current);

    return () => observer.disconnect();
  }, [loadMore, hasMore, threshold, rootMargin]);

  const setTargetRef = useCallback((element: HTMLDivElement | null) => {
    targetRef.current = element;
    if (observerRef.current && element) observerRef.current.observe(element);
  }, []);

  return { setTargetRef };
}

export default useLazyMovimientos;
