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
      className="rounded-2xl md:rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
    >
      {/* Header compacto */}
      <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600">
              <Activity size={16} className="md:size-4.5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                Actividad Reciente
              </h2>
              <p className="text-[10px] md:text-xs text-slate-500 hidden sm:block">Últimas consultas</p>
            </div>
          </div>
          <span className="text-[10px] md:text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
            {activities?.length ?? 0} hoy
          </span>
        </div>
      </div>

      {/* Lista compacta */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {activities?.slice(0, 4).map((act, index) => (
          <motion.div
            key={act.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 px-4 py-3 md:px-6 md:py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
          >
            {/* Icono compacto */}
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 flex items-center justify-center text-indigo-500 shrink-0">
              <ClipboardList size={16} className="md:size-5" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                  {act.pacienteNombre}
                </p>
                <span className="text-[10px] md:text-xs text-slate-400 font-medium shrink-0">
                  {new Date(act.fecha_atencion).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                  Atención
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {act.staffNombre}
                </span>
              </div>
            </div>

            {/* Status dot */}
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          </motion.div>
        ))}

        {/* Empty state compacto */}
        {activities?.length === 0 && (
          <div className="text-center py-8 md:py-12">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700 mb-3 text-slate-300 dark:text-slate-600">
              <ClipboardList size={24} />
            </div>
            <p className="text-xs text-slate-400 font-medium">Sin actividad reciente</p>
          </div>
        )}

        {/* Skeleton/Loading */}
        {!activities && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </motion.div>
  );
}
