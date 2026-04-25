"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Skeleton } from "@/shared/ui/Skeleton";

// ───────────────────────────────────────────────────────────────────────────────
// TARJETAS DE ESTADÍSTICAS DEL DASHBOARD
// Muestra métricas principales en tarjetas con animaciones y estados de alerta
// ───────────────────────────────────────────────────────────────────────────────

interface Stat {
  label: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
  shadow: string;
  href: string;
  alert?: boolean;
}

interface StatCardsProps {
  stats: Stat[] | undefined;
}

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

export function StatCards({ stats }: StatCardsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 md:h-32 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  // Separar stats: primero 2 (Pacientes, Consultas), luego 2 (Stock, Por Vencer)
  const primaryStats = stats.slice(0, 2);
  const alertStats = stats.slice(2);

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Fila 1: Pacientes y Consultas - 2 columnas iguales */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {primaryStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} compact />
        ))}
      </div>

      {/* Fila 2: Stock Bajo y Por Vencer - Full width en móvil para destacar */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
        {alertStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} alert={stat.alert} />
        ))}
      </div>
    </div>
  );
}

interface StatCardProps {
  stat: Stat;
  compact?: boolean;
  alert?: boolean;
}

function StatCard({ stat, compact, alert }: StatCardProps) {
  return (
    <Link href={stat.href} className="block group">
      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`relative overflow-hidden rounded-xl md:rounded-2xl bg-white dark:bg-slate-800 transition-all border ${alert
          ? "border-rose-300 dark:border-rose-700 shadow-md"
          : "border-slate-200 dark:border-slate-700"
          } hover:shadow-lg ${stat.shadow}`}
      >
        {/* Alert Badge */}
        {alert && (
          <div className="absolute top-2 right-2 z-20">
            <span className="flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${stat.gradient.includes("rose") ? "bg-rose-400" : "bg-amber-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${stat.gradient.includes("rose") ? "bg-rose-500" : "bg-amber-500"}`}></span>
            </span>
          </div>
        )}

        <div className={`relative z-10 ${compact ? "p-3 md:p-6" : "p-3 md:p-5"}`}>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className={`font-semibold text-slate-500 dark:text-slate-400 mb-0.5 ${compact ? "text-[10px] md:text-sm" : "text-[10px] md:text-sm"}`}>
                {stat.label}
              </p>
              <p className={`font-bold text-slate-900 dark:text-white tabular-nums tracking-tight ${compact ? "text-xl md:text-3xl" : "text-lg md:text-2xl"}`}>
                {stat.value}
              </p>
            </div>
            <div
              className={`flex items-center justify-center rounded-xl text-white shadow-md transform group-hover:scale-110 transition-all duration-300 shrink-0 ${compact ? "h-10 w-10 md:h-14 md:w-14" : "h-9 w-9 md:h-12 md:w-12"} ${stat.gradient}`}
            >
              <stat.icon size={compact ? 20 : 18} className="md:size-6" />
            </div>
          </div>
        </div>

        {/* Background gradient effect */}
        <div className={`absolute -right-6 -bottom-6 h-20 w-20 md:h-24 md:w-24 rounded-full bg-linear-to-br ${stat.gradient} opacity-[0.08] blur-xl`} />
      </motion.div>
    </Link>
  );
}
