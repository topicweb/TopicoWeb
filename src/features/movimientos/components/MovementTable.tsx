"use client";

import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Package,
  Hash,
} from "lucide-react";
import { MovimientoConMedicamento } from "../types";

interface MovementTableProps {
  movements: MovimientoConMedicamento[];
}

export function MovementTable({ movements }: MovementTableProps) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Fecha
              </th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Insumo
              </th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Operación
              </th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cantidad
              </th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Referencia
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {movements.map((movement, index) => {
              const isEntrada = movement.tipo === "ENTRADA";
              const formattedDate = new Date(
                movement.fecha_movimiento
              ).toLocaleString("es-ES", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <motion.tr
                  key={movement.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="group transition-colors hover:bg-muted"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar size={16} className="text-muted-foreground" />
                      {formattedDate}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Package
                        size={16}
                        className="text-muted-foreground"
                      />
                      <span className="font-medium text-foreground">
                        {movement.medicamentoNombre}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isEntrada
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                        }`}
                    >
                      {isEntrada ? (
                        <ArrowDown size={12} />
                      ) : (
                        <ArrowUp size={12} />
                      )}
                      {isEntrada ? "Entrada" : "Salida"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-sm font-bold ${isEntrada
                        ? "text-emerald-600"
                        : "text-rose-600"
                        }`}
                    >
                      {isEntrada ? "+" : "-"}
                      {movement.cantidad}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-muted">
                      <Hash size={14} />
                      <span>
                        {movement.atencionPacienteNombre
                          ? `Atención - ${movement.atencionPacienteNombre}`
                          : "Ajuste Manual"}
                      </span>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
