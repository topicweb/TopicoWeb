"use client";

import { useAuth } from "@/core/providers/AuthProvider";
import { useNetwork } from "@/core/providers/NetworkProvider";
import { motion } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/core/db/dexie/db";
import { StatCards } from "@/shared/dashboard/StatCards";
import { RecentActivity } from "@/shared/dashboard/RecentActivity";
import { ExpiringStock } from "@/shared/dashboard/ExpiringStock";
import { Users, Pill, ClipboardList, AlertTriangle } from "lucide-react";

// ───────────────────────────────────────────────────────────────────────────────
// DASHBOARD PAGE
// Panel principal con estadísticas en tiempo real y controles de sistema
// ───────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { businessId, user } = useAuth();
  const { isOnline } = useNetwork();

  // Estadísticas del dashboard en tiempo real
  const stats = useLiveQuery(async () => {
    if (!businessId) return undefined;

    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [patients, attentionsToday, lowStock, expiringStock] = await Promise.all([
      db.pacientes.where("[business_id+activo]").equals([businessId, 1]).count(),
      db.atenciones.where("[business_id+fecha_atencion]").between(
        [businessId, today],
        [businessId, today + "\uffff"]
      ).count(),
      db.medicamentos.where("[business_id+activo]").equals([businessId, 1])
        .filter((m) => (m.stock_actual ?? 0) <= m.stock_minimo).count(),
      // Productos por vencer (movimientos con fecha_vencimiento en próximos 30 días)
      db.movimientos_stock
        .where("[business_id+tipo]")
        .equals([businessId, "ENTRADA"])
        .filter((mov) => {
          if (!mov.fecha_vencimiento) return false;
          return mov.fecha_vencimiento >= today && mov.fecha_vencimiento <= thirtyDaysLater;
        })
        .count(),
    ]);

    return [
      { label: "Pacientes", value: patients, icon: Users, gradient: "from-teal-500 to-teal-600", shadow: "shadow-teal-200/20", href: "/dashboard/patients" },
      { label: "Consultas Hoy", value: attentionsToday, icon: ClipboardList, gradient: "from-emerald-500 to-emerald-600", shadow: "shadow-emerald-200/20", href: "/dashboard/attentions" },
      { label: "Stock Bajo", value: lowStock, icon: Pill, gradient: "from-rose-500 to-rose-600", shadow: "shadow-rose-200/20", href: "/dashboard/inventory", alert: lowStock > 0 },
      { label: "Por Vencer", value: expiringStock, icon: AlertTriangle, gradient: "from-amber-500 to-amber-600", shadow: "shadow-amber-200/20", href: "/dashboard/inventory", alert: expiringStock > 0 },
    ];
  }, [businessId]);

  // Actividad reciente con nombres de pacientes y staff
  const recentActivity = useLiveQuery(async () => {
    if (!businessId) return [];
    const recents = await db.atenciones.where("business_id").equals(businessId).reverse().limit(5).toArray();
    return await Promise.all(
      recents.map(async (a) => {
        const [p, staff] = await Promise.all([
          db.pacientes.get(a.paciente_id),
          db.perfiles.get(a.perfil_id),
        ]);
        return {
          ...a,
          pacienteNombre: p ? `${p.nombres} ${p.apellidos}` : "Desconocido",
          pacienteDNI: p?.dni || '',
          staffNombre: staff?.nombre ?? "Desconocido",
        };
      }),
    );
  }, [businessId]);

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header con controles de sistema */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4 border-b border-accent">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-primary">Panel Principal</h1>
          <p className="text-slate-500 dark:text-primary mt-1">
            Bienvenido, <span className="font-semibold text-teal-600">{user?.email?.split("@")[0]}</span>
          </p>
        </div>

        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium 
          ${isOnline ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-600/30 dark:text-emerald-900" 
          : "bg-rose-50 text-rose-900 dark:bg-rose-600/30 dark:text-rose-900"}`}>
          {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
          {isOnline ? "Online" : "Offline"}
        </div>
      </div>

      {/* Estadísticas principales */}
      <StatCards stats={stats} />

      {/* Alertas de stock próximo a vencer */}
      <ExpiringStock businessId={businessId} />

      {/* Actividad reciente */}
      <RecentActivity activities={recentActivity} />
    </motion.div>
  );
}
