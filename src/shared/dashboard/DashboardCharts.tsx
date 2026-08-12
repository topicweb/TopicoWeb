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
import { useAuth } from "@/core/providers/AuthProvider";
import { useState, useEffect } from "react";

// ───────────────────────────────────────────────────────────────────────────────
// GRÁFICOS DEL DASHBOARD
// Muestra atenciones semanales y salida de medicamentos en gráficos interactivos
// ───────────────────────────────────────────────────────────────────────────────

const CHART_COLORS = ["#1D5DFF", "#059669", "#0891b2", "#b45309", "#b91c1c"];

const cardStyle =
  "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md";

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  background: "rgba(255, 255, 255, 0.98)",
  boxShadow: "0 8px 30px rgba(237, 238, 239, 0.08)",
  fontSize: "12px",
  fontWeight: "600" as const,
  color: "#0f172a",
};

export function DashboardCharts() {
  const { businessId } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const attentionsData = useLiveQuery(async () => {
    if (!businessId) return [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const isoCutoff = cutoff.toISOString();

    const atenciones = await db.atenciones
      .where("[business_id+fecha_atencion]")
      .aboveOrEqual([businessId, isoCutoff])
      .toArray();

    const tenantAtenciones = atenciones.filter((a) => a.business_id === businessId);

    const countsByDate = new Map<string, number>();
    tenantAtenciones.forEach((att) => {
      const date = att.fecha_atencion.split("T")[0];
      countsByDate.set(date, (countsByDate.get(date) || 0) + 1);
    });

    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("es-ES", { weekday: "short" });
      result.push({
        date: dateStr,
        day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        count: countsByDate.get(dateStr) || 0,
      });
    }

    return result;
  }, [businessId]);

  const medicineData = useLiveQuery(async () => {
    if (!businessId) return [];

    const salidas = await db.movimientos_stock
      .where("business_id")
      .equals(businessId)
      .filter((s) => s.tipo === "SALIDA")
      .toArray();

    const countsByMed = new Map<string, number>();
    salidas.forEach((salida) => {
      countsByMed.set(
        salida.medicamento_id,
        (countsByMed.get(salida.medicamento_id) || 0) + salida.cantidad
      );
    });

    const entries = Array.from(countsByMed.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return Promise.all(
      entries.map(async ([medId, count]) => {
        const med = await db.medicamentos.get(medId);
        return {
          name: med ? med.nombre : "Desconocido",
          value: count,
        };
      })
    );
  }, [businessId]);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className={cardStyle}>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Atenciones Semanales
          </h3>
          <div className="h-2 w-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_rgba(29,93,255,0.35)]" />
        </div>

        <div className="h-62.5 w-full">
          {mounted && attentionsData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={attentionsData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1D5DFF" stopOpacity={1} />
                    <stop offset="100%" stopColor="#1648cc" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(15, 23, 42, 0.06)"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                />
                <Tooltip cursor={{ fill: "rgba(29, 93, 255, 0.04)", radius: 8 }} contentStyle={tooltipStyle} />
                <Bar
                  dataKey="count"
                  fill="url(#barGradient)"
                  radius={[10, 10, 0, 0]}
                  barSize={32}
                  animationBegin={200}
                  animationDuration={1200}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="size-full rounded-2xl" />
          )}
        </div>
      </div>

      <div className={cardStyle}>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Salida de Medicamentos
          </h3>
          <div className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_rgba(5,150,105,0.35)]" />
        </div>

        <div className="relative h-62.5 w-full">
          {mounted && medicineData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={medicineData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                  animationBegin={400}
                  animationDuration={1200}
                >
                  {medicineData?.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name}-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      className="cursor-pointer transition-opacity hover:opacity-90 focus:outline-none"
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="size-full rounded-2xl" />
          )}

          {medicineData && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Despachos
              </span>
              <span className="mt-1 text-3xl font-bold text-slate-900">
                {medicineData.reduce((acc, curr) => acc + curr.value, 0)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
