"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, } from "recharts";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/core/db/dexie/db";
import { Skeleton } from "../ui/Skeleton";
import { useAuth } from "@/core/providers/AuthProvider";
import { useState, useEffect } from "react";

const COLORS = ["#0d9488", "#0891b2", "#059669", "#d97706", "#dc2626"];

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

    const tenantAtenciones = atenciones.filter(a => a.business_id === businessId);

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
      const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
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
      .filter(s => s.tipo === "SALIDA")
      .toArray();

    const countsByMed = new Map<string, number>();
    salidas.forEach((salida) => {
      countsByMed.set(
        salida.medicamento_id,
        (countsByMed.get(salida.medicamento_id) || 0) + salida.cantidad,
      );
    });

    const entries = Array.from(countsByMed.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

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
  }, [businessId]);

  const cardStyle = "bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md";

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {/* Bar Chart */}
      <div className={cardStyle}>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Atenciones Semanales
          </h3>
          <div className="h-2 w-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(13,148,136,0.3)]" />
        </div>

        <div className="w-full h-62.5">
          {mounted && attentionsData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attentionsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={1} />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.03)', radius: 8 }}
                  contentStyle={{
                    borderRadius: "20px",
                    border: "none",
                    background: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.1)",
                    fontSize: '12px',
                    fontWeight: '900',
                    color: '#1e293b'
                  }}
                />
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

      {/* Pie Chart */}
      <div className={cardStyle}>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Salida de Medicamentos
          </h3>
          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
        </div>

        <div className="relative w-full h-62.5">
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
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      className="hover:opacity-90 transition-opacity cursor-pointer focus:outline-none"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    background: "rgba(255, 255, 255, 0.98)",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#1e293b'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="size-full rounded-2xl" />
          )}

          {/* Center text for Donut chart */}
          {medicineData && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Despachos</span>
              <span className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {medicineData.reduce((acc, curr) => acc + curr.value, 0)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
