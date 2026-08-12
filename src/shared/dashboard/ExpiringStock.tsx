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
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const expiringMovements = await db.movimientos_stock
      .where("[business_id+tipo]")
      .equals([businessId, "ENTRADA"])
      .filter((mov) => {
        if (!mov.fecha_vencimiento) return false;
        return mov.fecha_vencimiento >= today && mov.fecha_vencimiento <= thirtyDaysLater;
      })
      .limit(5)
      .toArray();

    const enriched = await Promise.all(
      expiringMovements.map(async (mov) => {
        const med = await db.medicamentos.get(mov.medicamento_id);
        if (!med || med.activo === 0) return null;
        return {
          ...mov,
          medicamentoNombre: med.nombre,
          unidadMedida: med.unidad_medida,
        };
      })
    );

    return enriched.filter((item): item is NonNullable<typeof item> => item !== null);
  }, [businessId]);

  if (!expiringItems || expiringItems.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-[var(--warning)]/25 bg-[var(--warning-soft)]"
    >
      <div className="border-b border-[var(--warning)]/20 bg-amber-100/60 px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--warning)] text-white shadow-sm">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900 md:text-base">
                Stock por Vencer
              </h3>
              <p className="text-xs text-amber-800/80">Próximos 30 días</p>
            </div>
          </div>
          <Link
            href="/dashboard/inventory"
            className="flex items-center gap-1 text-xs font-semibold text-[var(--warning)] transition-colors hover:text-amber-900"
          >
            Ver todo
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className="divide-y divide-amber-200/60 bg-white/60">
        {expiringItems.map((item) => (
          <Link
            key={item.id}
            href="/dashboard/inventory"
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-amber-50 md:px-6"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white">
              <Package size={18} className="text-[var(--warning)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {item.medicamentoNombre}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  +{item.cantidad} {item.unidadMedida}
                </span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                  Entrada
                </span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="flex items-center gap-1 text-[var(--warning)]">
                <Calendar size={12} />
                <span className="text-xs font-medium">
                  {item.fecha_vencimiento
                    ? new Date(item.fecha_vencimiento).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                      })
                    : "Sin fecha"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
