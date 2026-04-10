"use client";

import { useAuth } from "@/core/providers/AuthProvider";
import { useNetwork } from "@/core/providers/NetworkProvider";
import { motion } from "framer-motion";
import { Wifi, WifiOff, DatabaseZap, Trash2 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, clearDatabase } from "@/core/db/dexie/db";
import { seedDatabase } from "@/shared/utils/seedData";
import { StatCards } from "@/shared/dashboard/StatCards";
import { RecentActivity } from "@/shared/dashboard/RecentActivity";
import { ExpiringStock } from "@/shared/dashboard/ExpiringStock";
import { Users, Pill, ClipboardList, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  const { businessId, user } = useAuth();
  const { isOnline } = useNetwork();

  const stats = useLiveQuery(async () => {
    if (!businessId) return undefined;

    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [patients, attentionsToday, lowStock, expiringStock] = await Promise.all([
      db.pacientes.where("business_id").equals(businessId).count(),
      db.atenciones.where("[business_id+fecha_atencion]").between(
        [businessId, today],
        [businessId, today + "\uffff"]
      ).count(),
      db.medicamentos.where("[business_id+activo]").equals([businessId, 1])
        .filter((m) => (m.stock_actual ?? 0) <= m.stock_minimo).count(),
      // Productos por vencer (busca movimientos de entrada recientes)
      db.movimientos_stock
        .where("[business_id+tipo+fecha_movimiento]")
        .between([businessId, "ENTRADA", today], [businessId, "ENTRADA", thirtyDaysLater + "\uffff"])
        .count(),
    ]);

    return [
      { label: "Pacientes", value: patients, icon: Users, gradient: "from-teal-500 to-teal-600", shadow: "shadow-teal-200/20", href: "/dashboard/patients" },
      { label: "Consultas Hoy", value: attentionsToday, icon: ClipboardList, gradient: "from-emerald-500 to-emerald-600", shadow: "shadow-emerald-200/20", href: "/dashboard/attentions" },
      { label: "Stock Bajo", value: lowStock, icon: Pill, gradient: "from-rose-500 to-rose-600", shadow: "shadow-rose-200/20", href: "/dashboard/inventory", alert: lowStock > 0 },
      { label: "Por Vencer", value: expiringStock, icon: AlertTriangle, gradient: "from-amber-500 to-amber-600", shadow: "shadow-amber-200/20", href: "/dashboard/inventory", alert: expiringStock > 0 },
    ];
  }, [businessId]);

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
          staffNombre: staff?.nombre ?? "Desconocido",
        };
      }),
    );
  }, [businessId]);

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Panel Principal</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Bienvenido, <span className="font-semibold text-teal-600">{user?.email?.split("@")[0]}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => user?.email && user?.id && seedDatabase(user.email, user.id)}
            className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300"
          >
            <DatabaseZap size={16} />
            Semilla
          </button>

          <button
            onClick={() => {
              if (confirm('¿Estás seguro? Esto borrará TODOS los datos locales y recargará la página.')) {
                clearDatabase();
              }
            }}
            className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300"
            title="Limpiar base de datos local"
          >
            <Trash2 size={16} />
          </button>

          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${isOnline ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"}`}>
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isOnline ? "Online" : "Offline"}
          </div>
        </div>
      </div>

      {/* Stats Grid - Optimizado para móvil */}
      <StatCards stats={stats} />

      {/* Stock por Vencer - Sección destacada */}
      <ExpiringStock businessId={businessId} />

      {/* Recent Activity - Compacto */}
      <RecentActivity activities={recentActivity} />
    </motion.div>
  );
}
