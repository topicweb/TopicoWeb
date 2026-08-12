"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, Package, TrendingUp, TrendingDown } from "lucide-react";
import { useMovimientos } from "@/features/movimientos/hooks/useMovimientos";
import {
  MovementCard,
  MovementTable,
  SearchFilter,
  EmptyState,
  MovementSkeleton,
} from "@/features/movimientos/components";

// ───────────────────────────────────────────────────────────────────────────────
// MOVEMENTS HISTORY PAGE
// Kardex de inventario con búsqueda, filtros y vistas responsive
// ───────────────────────────────────────────────────────────────────────────────

export default function MovementsPage() {
  const { movimientos, loading } = useMovimientos();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "entrada" | "salida">("all");
  const [isSearching, setIsSearching] = useState(false);

  // ── PERFORMANCE Y FILTRADO ─────────────────────────────────────────────────────

  // Debounce para búsqueda (300ms)
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtrado optimizado con memoización
  const filteredMovements = useMemo(() => {
    return movimientos.filter((m) => {
      const matchesSearch = !debouncedTerm ||
        m.medicamentoNombre?.toLowerCase().includes(debouncedTerm.toLowerCase());

      const matchesType =
        filterType === "all" ||
        m.tipo.toLowerCase() === filterType;

      return matchesSearch && matchesType;
    });
  }, [movimientos, debouncedTerm, filterType]);

  // Estadísticas del kardex
  const stats = useMemo(() => {
    const entradas = movimientos.filter(m => m.tipo === "ENTRADA").length;
    const salidas = movimientos.filter(m => m.tipo === "SALIDA").length;
    return { total: movimientos.length, entradas, salidas };
  }, [movimientos]);

  return (
    <div className="space-y-6">
      {/* Header con estadísticas y filtros */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-primary shadow-sm">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Historial de <span className="text-gradient">Movimientos</span>
                </h1>
                <p className="text-sm text-muted">
                  Kardex de entradas y salidas de inventario
                </p>
              </div>
            </div>
          </div>

          {/* Estadísticas desktop */}
          <div className="hidden items-center gap-3 sm:flex">
            <div className="glass-card px-4 py-2">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-muted-foreground" />
                <span className="text-xs text-muted">Total</span>
                <span className="text-sm font-semibold text-foreground">
                  {stats.total}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-600" />
                <span className="text-xs text-emerald-700">Entradas</span>
                <span className="text-sm font-semibold text-emerald-700">
                  {stats.entradas}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-2">
              <div className="flex items-center gap-2">
                <TrendingDown size={16} className="text-rose-600" />
                <span className="text-xs text-rose-700">Salidas</span>
                <span className="text-sm font-semibold text-rose-700">
                  {stats.salidas}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros de búsqueda */}
        <SearchFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterType={filterType}
          onFilterChange={setFilterType}
        />

        {/* Estadísticas mobile */}
        <div className="grid grid-cols-3 gap-2 sm:hidden">
          <div className="glass-card p-3 text-center">
            <div className="text-xs text-muted">Total</div>
            <div className="text-lg font-bold text-foreground">{stats.total}</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
            <div className="text-xs text-emerald-700">Entradas</div>
            <div className="text-lg font-bold text-emerald-700">{stats.entradas}</div>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-center">
            <div className="text-xs text-rose-700">Salidas</div>
            <div className="text-lg font-bold text-rose-700">{stats.salidas}</div>
          </div>
        </div>
      </motion.div>

      {/* Contador de resultados */}
      {!loading && !isSearching && filteredMovements.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted"
        >
          Mostrando {filteredMovements.length} de {movimientos.length} movimientos
        </motion.div>
      )}

      {/* Contenido principal con vistas responsive */}
      {loading || isSearching ? (
        <>
          <div className="hidden sm:block">
            <MovementSkeleton count={8} viewMode="table" />
          </div>
          <div className="sm:hidden">
            <MovementSkeleton count={6} viewMode="cards" />
          </div>
        </>
      ) : filteredMovements.length > 0 ? (
        <>
          {/* Vista desktop: tabla */}
          <div className="hidden sm:block">
            <MovementTable movements={filteredMovements} />
          </div>

          {/* Vista mobile: cards */}
          <div className="grid gap-3 sm:hidden">
            {filteredMovements.map((movement, index) => (
              <MovementCard
                key={movement.id}
                movement={movement}
                index={index}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          hasSearchTerm={!!searchTerm || filterType !== "all"}
          searchTerm={searchTerm || (filterType !== "all" ? filterType : undefined)}
        />
      )}
    </div>
  );
}
