"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/core/providers/AuthProvider";
import { useNetwork } from "@/core/providers/NetworkProvider";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// SaaS Pattern: Dynamic import with SSR disabled to avoid measurement issues and hydration mismatches
const DashboardCharts = dynamic(
  () => import("@/shared/dashboard/DashboardCharts").then(m => m.DashboardCharts),
  { 
    ssr: false,
    loading: () => <div className="h-[250px] w-full rounded-3xl bg-gray-50/50 animate-pulse border border-gray-100 dark:bg-gray-800/20 dark:border-gray-700" />
  }
);
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
import { Skeleton } from "@/shared/ui/Skeleton";

export default function DashboardPage() {
  const { businessId, user } = useAuth();
  const { isOnline } = useNetwork();

  // Real stats - Optimizadas para multi-tenancy y con índices compuestos
  const stats = useLiveQuery(async () => {
    if (typeof window === "undefined" || !businessId) return undefined;
    
    // 1. Pacientes del tenant
    const patients = await db.pacientes
      .where("business_id").equals(businessId)
      .count();
    
    // 2. Medicamentos activos del tenant (Usa el índice compuesto [business_id+activo])
    const meds = await db.medicamentos
      .where("[business_id+activo]")
      .equals([businessId, 1])
      .count();
    
    // 3. Stock bajo del tenant (Filtro optimizado sobre índice compuesto)
    const lowStock = await db.medicamentos
      .where("[business_id+activo]")
      .equals([businessId, 1])
      .filter((m) => (m.stock_actual ?? 0) <= m.stock_minimo)
      .count();

    const today = new Date().toISOString().split("T")[0];
    
    // 4. Atenciones hoy (Usa el nuevo índice compuesto [business_id+fecha_atencion])
    const attentionsToday = await db.atenciones
      .where("[business_id+fecha_atencion]")
      .between([businessId, today], [businessId, today + "\uffff"])
      .count();

    return [
      {
        label: "Pacientes",
        value: patients,
        icon: Users,
        gradient: "from-blue-500 to-indigo-600",
        shadow: "shadow-blue-200 dark:shadow-blue-900/20",
        href: "/dashboard/patients",
      },
      {
        label: "Atenciones Hoy",
        value: attentionsToday,
        icon: ClipboardList,
        gradient: "from-emerald-500 to-teal-600",
        shadow: "shadow-emerald-200 dark:shadow-emerald-900/20",
        href: "/dashboard/attentions",
      },
      {
        label: "Stock Bajo",
        value: lowStock,
        icon: Pill,
        gradient: "from-orange-500 to-amber-600",
        shadow: "shadow-orange-200 dark:shadow-orange-900/20",
        href: "/dashboard/inventory",
      },
    ];
  }, [businessId]);

  const recentActivity = useLiveQuery(async () => {
    if (typeof window === "undefined" || !businessId) return [];
    
    const recents = await db.atenciones
      .where("business_id").equals(businessId)
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
  }, [businessId]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="space-y-5 md:space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header Section */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-gray-100 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white md:text-3xl">
            Panel Principal
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Bienvenido, <span className="font-semibold text-indigo-600 dark:text-indigo-400">{user?.email?.split('@')[0]}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => user?.email && user?.id && seedDatabase(user.email, user.id)}
            className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all dark:bg-indigo-900/30 dark:text-indigo-300"
          >
            <DatabaseZap size={14} />
            Semilla
          </button>

          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-sm ${
              isOnline 
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" 
                : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
            }`}
          >
            {isOnline ? <Wifi size={14} className="animate-pulse" /> : <WifiOff size={14} />}
            {isOnline ? "Online" : "Offline"}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {stats ? (
            stats.map((stat) => (
              <Link key={stat.label} href={stat.href} className="block group">
                <motion.div
                  variants={item}
                  initial={false}
                  animate="show"
                  exit="hidden"
                  whileHover={{ 
                    y: -8, 
                    transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] }
                  }}
                  className={`relative overflow-hidden rounded-[2.5rem] bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl p-8 transition-all border border-white/50 dark:border-gray-700/50 ${stat.shadow} hover:shadow-2xl hover:border-indigo-500/30`}
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500 mb-2">
                        {stat.label}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-5xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                          {stat.value}
                        </p>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                          EXPLORAR →
                        </span>
                      </div>
                    </div>
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-2xl shadow-indigo-500/20 transform group-hover:rotate-12 transition-all duration-500 ${stat.gradient}`}
                    >
                      <stat.icon className="h-8 w-8" />
                    </div>
                  </div>
                  
                  {/* Decorative Glass Elements */}
                  <div className={`absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-gradient-to-br ${stat.gradient} opacity-[0.08] dark:opacity-[0.15] blur-3xl group-hover:opacity-30 transition-opacity`} />
                  <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-r from-transparent via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              </Link>
            ))
          ) : (
            // Skeletons para evitar el efecto de carga tardía
            [1, 2, 3].map((i) => (
              <motion.div
                key={`sk-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Skeleton className="h-32 w-full rounded-2xl" />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section - Takes 2 columns */}
        <motion.div variants={item} className="lg:col-span-2 space-y-6">
          <DashboardCharts />
        </motion.div>

        {/* Recent Activity - Takes 1 column */}
        <motion.div
          variants={item}
          className="rounded-[2.5rem] bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl p-8 border border-white/50 dark:border-gray-700/50 shadow-sm h-full relative overflow-hidden group"
        >
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] dark:opacity-[0.05] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
            <Activity size={180} className="text-indigo-500 transform rotate-12" />
          </div>

          <div className="flex items-center justify-between mb-10 relative z-10">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                Actividad Viva
              </h2>
              <p className="text-[10px] font-black text-indigo-500/60 uppercase tracking-[0.2em] mt-1">Monitoreo en tiempo real</p>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-inner group-hover:scale-110 transition-transform">
               <Activity size={20} />
            </div>
          </div>
          
          <div className="space-y-8 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-[1px] before:bg-gradient-to-b before:from-indigo-500/20 before:via-transparent before:to-transparent">
            {recentActivity?.map((act) => (
              <div key={act.id} className="relative pl-14 group/act cursor-default">
                <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900/50 text-indigo-500 shadow-sm z-10 group-hover/act:border-indigo-500 group-hover/act:shadow-indigo-500/20 transition-all duration-300">
                  <ClipboardList size={20} className="group-hover/act:scale-110 transition-transform" />
                </div>
                <div className="transform group-hover/act:translate-x-1 transition-transform">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">
                      Nueva atención
                    </p>
                    <p className="text-[10px] text-slate-400 font-extrabold bg-slate-100/50 dark:bg-slate-800/50 px-3 py-1 rounded-full">
                      {new Date(act.fecha_atencion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <p className="font-black text-slate-800 dark:text-slate-100 text-base mt-1 leading-tight group-hover/act:text-indigo-600 dark:group-hover/act:text-indigo-400 transition-colors">
                    {act.pacienteNombre}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                     <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        Registro completado con éxito
                     </p>
                  </div>
                </div>
              </div>
            ))}
            
            {recentActivity?.length === 0 && (
              <div className="text-center py-20">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-[2rem] bg-indigo-50/50 dark:bg-indigo-900/10 mb-6 text-indigo-200 dark:text-indigo-900 animate-pulse">
                  <ClipboardList size={40} />
                </div>
                <p className="text-sm text-slate-400 font-black uppercase tracking-widest">Paz total por ahora</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
