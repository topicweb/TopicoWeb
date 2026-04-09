"use client";

import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/core/db";
import { useNetwork } from "@/core/providers/NetworkProvider";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from "lucide-react";

export const SyncMonitor = () => {
  const { isOnline } = useNetwork();

  const pendingCount = useLiveQuery(async () => {
    // Sumamos todos los registros pendientes de todas las tablas principales
    const [pacientes, atenciones, movimientos, medicamentos, audit] = await Promise.all([
      db.pacientes.where("sync_status").equals("pending").count(),
      db.atenciones.where("sync_status").equals("pending").count(),
      db.movimientos_stock.where("sync_status").equals("pending").count(),
      db.medicamentos.where("sync_status").equals("pending").count(),
      db.security_audit_log.where("sync_status").equals("pending").count(), // FASE 4.3
    ]);
    return pacientes + atenciones + movimientos + medicamentos + audit;
  }, []);

  const hasPending = (pendingCount || 0) > 0;

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      <div className="glass-card rounded-2xl p-1.5 flex items-center gap-3 pr-4 shadow-xl border-white/20">
        {/* Connection Status Icon */}
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${isOnline ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}>
          {isOnline ? <Cloud size={18} /> : <CloudOff size={18} />}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Sincronización
            </span>
            <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          </div>

          <div className="flex items-center gap-2">
            {hasPending ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key="pending"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw size={12} className="text-amber-500 animate-spin" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {pendingCount} pendientes
                  </span>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-teal-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Al día
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
