"use client";

import { motion } from "framer-motion";
import { Activity, ClipboardList } from "lucide-react";
import type { AtencionConDetalles } from "@/features/atenciones";

// ───────────────────────────────────────────────────────────────────────────────
// ACTIVIDAD RECIENTE
// Muestra las últimas atenciones médicas del día
// ───────────────────────────────────────────────────────────────────────────────

interface RecentActivityProps {
  activities: (AtencionConDetalles & { pacienteNombre: string })[] | undefined;
}

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <motion.div
      variants={item}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:rounded-3xl"
    >
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] md:h-8 md:w-8">
              <Activity size={16} className="md:size-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 md:text-base">
                Actividad Reciente
              </h2>
              <p className="hidden text-[10px] text-slate-500 sm:block md:text-xs">
                Últimas consultas
              </p>
            </div>
          </div>
          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--accent)] md:text-xs">
            {activities?.length ?? 0} hoy
          </span>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {activities?.slice(0, 4).map((act, index) => (
          <motion.div
            key={act.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 md:px-6 md:py-3.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--primary)]/15 bg-[var(--primary-soft)] text-[var(--primary)] md:h-10 md:w-10">
              <ClipboardList size={16} className="md:size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {act.pacienteNombre}
                </p>
                <span className="shrink-0 text-[10px] font-medium text-slate-400 md:text-xs">
                  {new Date(act.fecha_atencion).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                  Atención
                </span>
                <span className="truncate text-[10px] text-slate-500">
                  {act.staffNombre}
                </span>
              </div>
            </div>

            <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--accent)]" />
          </motion.div>
        ))}

        {activities?.length === 0 && (
          <div className="py-8 text-center md:py-12">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
              <ClipboardList size={24} />
            </div>
            <p className="text-xs font-medium text-slate-400">Sin actividad reciente</p>
          </div>
        )}

        {!activities && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </motion.div>
  );
}
