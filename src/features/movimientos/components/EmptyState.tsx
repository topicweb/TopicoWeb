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
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted px-6 py-16"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-soft)]">
        {hasSearchTerm ? (
          <Search size={28} className="text-primary" />
        ) : (
          <PackageX size={28} className="text-primary" />
        )}
      </div>
      <h3 className="mb-1 text-base font-semibold text-foreground">
        {hasSearchTerm ? "No se encontraron resultados" : "Sin movimientos"}
      </h3>
      <p className="max-w-xs text-center text-sm text-muted">
        {hasSearchTerm
          ? `No hay movimientos que coincidan con "${searchTerm}". Intenta con otro término.`
          : "Aún no hay movimientos registrados en el sistema. Los movimientos aparecerán aquí cuando se realicen entradas o salidas de stock."}
      </p>
    </motion.div>
  );
}
