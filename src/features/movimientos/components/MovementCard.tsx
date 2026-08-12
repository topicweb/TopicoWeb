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
      className="glass-card group relative overflow-hidden p-4 transition-all hover:border-primary/20 hover:shadow-[var(--card-shadow)]"
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
          <div className="flex items-center gap-2 text-xs text-muted">
            <Calendar size={14} />
            <span>{formattedDate}</span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isEntrada
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
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
            className="mt-0.5 shrink-0 text-muted-foreground"
          />
          <h3 className="line-clamp-2 font-semibold text-foreground">
            {movement.medicamentoNombre}
          </h3>
        </div>

        {/* Details Row */}
        <div className="flex items-center justify-between border-t border-border pt-2">
          {/* Quantity */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${isEntrada
                ? "bg-emerald-50"
                : "bg-rose-50"
                }`}
            >
              <Tag size={14} className={isEntrada ? "text-emerald-600" : "text-rose-600"} />
              <span
                className={`text-sm font-bold ${isEntrada
                  ? "text-emerald-700"
                  : "text-rose-700"
                  }`}
              >
                {isEntrada ? "+" : "-"}
                {movement.cantidad}
              </span>
            </div>
          </div>

          {/* Reference */}
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Hash size={12} />
            <span className="max-w-30 truncate">
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
