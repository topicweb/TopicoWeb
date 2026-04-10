"use client";

import { motion } from "framer-motion";
import { PackageX, Search } from "lucide-react";

interface EmptyStateProps {
  hasSearchTerm: boolean;
  searchTerm?: string;
}

export function EmptyState({ hasSearchTerm, searchTerm }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 dark:border-slate-800 dark:bg-slate-900/50"
    >
      <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
        {hasSearchTerm ? (
          <Search size={32} className="text-slate-400" />
        ) : (
          <PackageX size={32} className="text-slate-400" />
        )}
      </div>
      <h3 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-100">
        {hasSearchTerm ? "No se encontraron resultados" : "Sin movimientos"}
      </h3>
      <p className="max-w-xs text-center text-sm text-slate-500 dark:text-slate-400">
        {hasSearchTerm
          ? `No hay movimientos que coincidan con "${searchTerm}". Intenta con otro término.`
          : "Aún no hay movimientos registrados en el sistema. Los movimientos aparecerán aquí cuando se realicen entradas o salidas de stock."}
      </p>
    </motion.div>
  );
}
