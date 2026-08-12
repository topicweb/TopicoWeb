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
          <Skeleton key={i} className="h-24 w-full rounded-2xl md:h-32" />
        ))}
      </div>
    );
  }

  const primaryStats = stats.slice(0, 2);
  const alertStats = stats.slice(2);

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {primaryStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} compact />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4">
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
  const isRoseAlert = stat.gradient.includes("rose");

  return (
    <Link href={stat.href} className="group block">
      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`relative overflow-hidden rounded-xl border bg-white transition-all hover:shadow-lg md:rounded-2xl ${
          alert
            ? isRoseAlert
              ? "border-[var(--danger)]/30 shadow-sm"
              : "border-[var(--warning)]/30 shadow-sm"
            : "border-slate-200 shadow-sm"
        } ${stat.shadow}`}
      >
        {alert && (
          <div className="absolute right-2 top-2 z-20">
            <span className="flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  isRoseAlert ? "bg-red-400" : "bg-amber-400"
                }`}
              />
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  isRoseAlert ? "bg-[var(--danger)]" : "bg-[var(--warning)]"
                }`}
              />
            </span>
          </div>
        )}

        <div className={`relative z-10 ${compact ? "p-3 md:p-6" : "p-3 md:p-5"}`}>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-[10px] font-semibold text-slate-500 md:text-sm">
                {stat.label}
              </p>
              <p
                className={`font-bold tabular-nums tracking-tight text-slate-900 ${
                  compact ? "text-xl md:text-3xl" : "text-lg md:text-2xl"
                }`}
              >
                {stat.value}
              </p>
            </div>
            <div
              className={`flex shrink-0 transform items-center justify-center rounded-xl bg-linear-to-br text-white shadow-md transition-all duration-300 group-hover:scale-110 ${
                compact ? "h-10 w-10 md:h-14 md:w-14" : "h-9 w-9 md:h-12 md:w-12"
              } ${stat.gradient}`}
            >
              <stat.icon size={compact ? 20 : 18} className="md:size-6" />
            </div>
          </div>
        </div>

        <div
          className={`absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-linear-to-br opacity-[0.07] blur-xl md:h-24 md:w-24 ${stat.gradient}`}
        />
      </motion.div>
    </Link>
  );
}
