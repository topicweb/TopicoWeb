"use client";

import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Package,
  Tag,
  Hash,
} from "lucide-react";
import { MovimientoConMedicamento } from "../types";

interface MovementCardProps {
  movement: MovimientoConMedicamento;
  index: number;
}

export function MovementCard({ movement, index }: MovementCardProps) {
  const isEntrada = movement.tipo === "ENTRADA";
  const formattedDate = new Date(movement.fecha_movimiento).toLocaleString(
    "es-ES",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
    >
      {/* Background gradient indicator */}
      <div
        className={`absolute left-0 top-0 h-full w-1 ${isEntrada
          ? "bg-linear-to-b from-emerald-400 to-emerald-600"
          : "bg-linear-to-b from-rose-400 to-rose-600"
          }`}
      />

      <div className="ml-3 space-y-3">
        {/* Header: Date and Type Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Calendar size={14} />
            <span>{formattedDate}</span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isEntrada
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
              }`}
          >
            {isEntrada ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
            {isEntrada ? "Entrada" : "Salida"}
          </span>
        </div>

        {/* Product Name */}
        <div className="flex items-start gap-2">
          <Package
            size={18}
            className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500"
          />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
            {movement.medicamentoNombre}
          </h3>
        </div>

        {/* Details Row */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Quantity */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${isEntrada
                ? "bg-emerald-50 dark:bg-emerald-900/20"
                : "bg-rose-50 dark:bg-rose-900/20"
                }`}
            >
              <Tag size={14} className={isEntrada ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} />
              <span
                className={`text-sm font-bold ${isEntrada
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-rose-700 dark:text-rose-400"
                  }`}
              >
                {isEntrada ? "+" : "-"}
                {movement.cantidad}
              </span>
            </div>
          </div>

          {/* Reference */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Hash size={12} />
            <span className="truncate max-w-30">
              {movement.atencionPacienteNombre
                ? `Atención - ${movement.atencionPacienteNombre}`
                : "Ajuste Manual"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
