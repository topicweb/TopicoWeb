"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight, Package, Calendar } from "lucide-react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/core/db/dexie/db";
import { Skeleton } from "@/shared/ui/Skeleton";

interface ExpiringStockProps {
  businessId: string | null;
}

export function ExpiringStock({ businessId }: ExpiringStockProps) {
  const expiringItems = useLiveQuery(async () => {
    if (!businessId) return [];

    const today = new Date().toISOString().split("T")[0];
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Buscar movimientos de entrada recientes (que podrían tener fecha de vencimiento)
    const recentMovements = await db.movimientos_stock
      .where("[business_id+tipo+fecha_movimiento]")
      .between([businessId, "ENTRADA", today], [businessId, "ENTRADA", sevenDaysLater + "\uffff"])
      .limit(5)
      .toArray();

    // Enriquecer con datos del medicamento
    const enriched = await Promise.all(
      recentMovements.map(async (mov) => {
        const med = await db.medicamentos.get(mov.medicamento_id);
        return {
          ...mov,
          medicamentoNombre: med?.nombre ?? "Desconocido",
          unidadMedida: med?.unidad_medida ?? "unidad",
        };
      })
    );

    return enriched;
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
                Próximos 7 días
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
                  {new Date(item.fecha_movimiento).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
