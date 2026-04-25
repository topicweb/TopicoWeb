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
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:space-y-8 sm:p-6 lg:p-8">
      {/* Header con estadísticas y filtros */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-linear-to-br from-teal-500 to-teal-600 p-2 shadow-lg shadow-teal-500/20">
                <ArrowLeftRight className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Historial de Movimientos
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 pl-11">
              Kardex de entradas y salidas de inventario
            </p>
          </div>

          {/* Estadísticas desktop */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="rounded-xl bg-white px-4 py-2 shadow-sm border border-slate-200 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Total</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {stats.total}
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-emerald-50 px-4 py-2 border border-emerald-100 dark:border-emerald-900/30 dark:bg-emerald-900/20">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs text-emerald-700 dark:text-emerald-400">Entradas</span>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {stats.entradas}
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-rose-50 px-4 py-2 border border-rose-100 dark:border-rose-900/30 dark:bg-rose-900/20">
              <div className="flex items-center gap-2">
                <TrendingDown size={16} className="text-rose-600 dark:text-rose-400" />
                <span className="text-xs text-rose-700 dark:text-rose-400">Salidas</span>
                <span className="text-sm font-semibold text-rose-700 dark:text-rose-400">
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
          <div className="rounded-xl bg-white p-3 text-center shadow-sm border border-slate-200 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs text-slate-500 dark:text-slate-400">Total</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{stats.total}</div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center border border-emerald-100 dark:border-emerald-900/30 dark:bg-emerald-900/20">
            <div className="text-xs text-emerald-700 dark:text-emerald-400">Entradas</div>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{stats.entradas}</div>
          </div>
          <div className="rounded-xl bg-rose-50 p-3 text-center border border-rose-100 dark:border-rose-900/30 dark:bg-rose-900/20">
            <div className="text-xs text-rose-700 dark:text-rose-400">Salidas</div>
            <div className="text-lg font-bold text-rose-700 dark:text-rose-400">{stats.salidas}</div>
          </div>
        </div>
      </motion.div>

      {/* Contador de resultados */}
      {!loading && !isSearching && filteredMovements.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-slate-500 dark:text-slate-400"
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
