"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/core/db/dexie/db";
import { Skeleton } from "../ui/Skeleton";
import { useState, useEffect } from "react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export function DashboardCharts() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Data 1: Attentions by Month (Simplified to last 7 days for demo)
  const attentionsData = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    
    // Direct Query Replacement for atencionRepo.getStatsLast7Days()
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const isoCutoff = cutoff.toISOString();

    const atenciones = await db.atenciones
      .where("fecha_atencion")
      .aboveOrEqual(isoCutoff)
      .toArray();

    // Agrupar por fecha
    const countsByDate = new Map<string, number>();
    atenciones.forEach((att) => {
      const date = att.fecha_atencion.split("T")[0]; // Solo YYYY-MM-DD
      countsByDate.set(date, (countsByDate.get(date) || 0) + 1);
    });

    // Generar últimos 7 días con 0 si no hay
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      result.push({
        date: dateStr,
        count: countsByDate.get(dateStr) || 0,
      });
    }

    return result;
  });

  // Data 2: Most dispensed medicines
  const medicineData = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    
    // Direct Query Replacement for movimientoRepo.getTopDispensed()
    const salidas = await db.movimientos_stock
      .filter((m) => m.tipo === "SALIDA")
      .toArray();

    const countsByMed = new Map<string, number>();
    salidas.forEach((salida) => {
      countsByMed.set(
        salida.medicamento_id,
        (countsByMed.get(salida.medicamento_id) || 0) + salida.cantidad,
      );
    });

    const entries = Array.from(countsByMed.entries())
      .sort((a, b) => b[1] - a[1]) // Descending
      .slice(0, 5); // Top 5

    // Resolve names
    const result = await Promise.all(
      entries.map(async ([medId, count]) => {
        const med = await db.medicamentos.get(medId);
        return {
          name: med ? med.nombre : "Desconocido",
          value: count,
        };
      }),
    );

    return result;
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Bar Chart */}
      <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h3 className="mb-4 font-bold text-gray-700 dark:text-gray-300">
          Atenciones (Últimos 7 días)
        </h3>
        {mounted && attentionsData ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={attentionsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Skeleton className="h-64 w-full" />
        )}
      </div>

      {/* Pie Chart */}
      <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h3 className="mb-4 font-bold text-gray-700 dark:text-gray-300">
          Medicamentos Más Entregados
        </h3>
        {mounted && medicineData ? (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={medicineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {medicineData?.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* ... (resto del código de la leyenda) */}
          </>
        ) : (
          <Skeleton className="h-64 w-full" />
        )}
      </div>
    </div>
  );
}
