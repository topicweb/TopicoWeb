"use client";

import { useAuth } from "@/core/providers/AuthProvider";
import { useNetwork } from "@/core/providers/NetworkProvider";
import { DashboardCharts } from "@/shared/dashboard/DashboardCharts";
import { motion } from "framer-motion";
import {
  Users,
  Pill,
  ClipboardList,
  Activity,
  Wifi,
  WifiOff,
  DatabaseZap,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/core/db/dexie/db";
import { seedDatabase } from "@/shared/utils/seedData";

export default function DashboardPage() {
  const { user } = useAuth();
  const { isOnline } = useNetwork();

  // Real stats
  const stats = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    const patients = await db.pacientes.count();
    const meds = await db.medicamentos.filter((m) => m.activo).count();
    const lowStock = await db.medicamentos
      .filter((m) => (m.stock_actual ?? 0) <= m.stock_minimo)
      .count();

    // Count attentions today
    const today = new Date().toISOString().split("T")[0];
    const attentionsToday = await db.atenciones
      .filter((a) => a.fecha_atencion.startsWith(today))
      .count();

    return [
      {
        label: "Pacientes",
        value: patients,
        icon: Users,
        color: "bg-blue-500",
      },
      {
        label: "Atenciones Hoy",
        value: attentionsToday,
        icon: ClipboardList,
        color: "bg-green-500",
      },
      {
        label: "Stock Bajo",
        value: lowStock,
        icon: Pill,
        color: "bg-yellow-500",
      },
    ];
  }, []);

  // Recent activity
  const recentActivity = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    const recents = await db.atenciones
      .orderBy("fecha_atencion")
      .reverse()
      .limit(5)
      .toArray();
    return await Promise.all(
      recents.map(async (a) => {
        const p = await db.pacientes.get(a.paciente_id);
        return {
          ...a,
          pacienteNombre: p ? `${p.nombres} ${p.apellidos}` : "Desconocido",
        };
      }),
    );
  });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Panel Principal
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Bienvenido, {user?.email}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Botón temporal para generar datos semilla */}
          <button
            onClick={() => user?.email && user?.id && seedDatabase(user.email, user.id)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 transition"
            title="Genera perfil Admin y datos de prueba para Dexie"
          >
            <DatabaseZap size={16} />
            Generar Datos Semilla
          </button>

          <div
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${isOnline ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
          >
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isOnline
              ? "Online - Sincronizado"
              : "Offline - Guardando localmente"}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stats?.map((stat) => (
          <motion.div
            key={stat.label}
            variants={item}
            className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg text-white ${stat.color}`}
              >
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <motion.div variants={item}>
        <DashboardCharts />
      </motion.div>

      <motion.div
        variants={item}
        className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800"
      >
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Actividad Reciente
        </h2>
        <div className="mt-4 space-y-4">
          {recentActivity?.map((act) => (
            <div
              key={act.id}
              className="flex items-center gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0 dark:border-gray-700"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Activity size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Nueva atención registrada
                </p>
                <p className="text-sm text-gray-500">
                  Paciente: {act.pacienteNombre} -{" "}
                  {new Date(act.fecha_atencion).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {recentActivity?.length === 0 && (
            <p className="text-gray-500">No hay actividad reciente.</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
