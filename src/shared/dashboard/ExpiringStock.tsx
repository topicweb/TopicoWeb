"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight, Package, Calendar } from "lucide-react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/core/db/dexie/db";

// ───────────────────────────────────────────────────────────────────────────────
// ALERTA DE STOCK POR VENCER
// Muestra medicamentos que vencerán en los próximos 30 días
// ───────────────────────────────────────────────────────────────────────────────

interface ExpiringStockProps {
  businessId: string | null;
}

export function ExpiringStock({ businessId }: ExpiringStockProps) {
  const expiringItems = useLiveQuery(async () => {
    if (!businessId) return [];

    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Buscar movimientos de entrada con fecha_vencimiento en próximos 30 días
    const expiringMovements = await db.movimientos_stock
      .where("[business_id+tipo]")
      .equals([businessId, "ENTRADA"])
      .filter((mov) => {
        // Solo movimientos con fecha_vencimiento definida
        if (!mov.fecha_vencimiento) return false;
        // Verificar que vence en los próximos 30 días
        return mov.fecha_vencimiento >= today && mov.fecha_vencimiento <= thirtyDaysLater;
      })
      .limit(5)
      .toArray();

    // Enriquecer con datos del medicamento y verificar que esté activo
    const enriched = await Promise.all(
      expiringMovements.map(async (mov) => {
        const med = await db.medicamentos.get(mov.medicamento_id);
        // Solo incluir si el medicamento está activo
        if (!med || med.activo === 0) return null;
        return {
          ...mov,
          medicamentoNombre: med.nombre,
          unidadMedida: med.unidad_medida,
        };
      })
    );

    // Filtrar nulls (medicamentos inactivos)
    return enriched.filter((item): item is NonNullable<typeof item> => item !== null);
  }, [businessId]);

  if (!expiringItems || expiringItems.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 md:px-6 md:py-4 border-b border-amber-200 dark:border-amber-800/50 bg-amber-100/50 dark:bg-amber-900/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-amber-500 flex items-center justify-center text-white">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 dark:text-amber-100 text-sm md:text-base">
                Stock por Vencer
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Próximos 30 días
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/inventory"
            className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
          >
            Ver todo
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {/* Lista compacta */}
      <div className="divide-y divide-amber-200/50 dark:divide-amber-800/30">
        {expiringItems.map((item) => (
          <Link
            key={item.id}
            href={`/dashboard/inventory`}
            className="flex items-center gap-3 px-4 py-3 md:px-6 hover:bg-amber-100/30 dark:hover:bg-amber-900/20 transition-colors"
          >
            <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center shrink-0">
              <Package size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                {item.medicamentoNombre}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  +{item.cantidad} {item.unidadMedida}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 font-medium">
                  Entrada
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <Calendar size={12} />
                <span className="text-xs font-medium">
                  {item.fecha_vencimiento ? new Date(item.fecha_vencimiento).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                  }) : "Sin fecha"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
