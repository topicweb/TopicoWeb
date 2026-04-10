"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/core/db";
import { useNetwork } from "@/core/providers/NetworkProvider";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from "lucide-react";

export const SyncMonitor = () => {
  const { isOnline } = useNetwork();

  const pendingCount = useLiveQuery(async () => {
    const [pacientes, atenciones, movimientos, medicamentos, audit] = await Promise.all([
      db.pacientes.where("sync_status").equals("pending").count(),
      db.atenciones.where("sync_status").equals("pending").count(),
      db.movimientos_stock.where("sync_status").equals("pending").count(),
      db.medicamentos.where("sync_status").equals("pending").count(),
      db.security_audit_log.where("sync_status").equals("pending").count(),
    ]);
    return pacientes + atenciones + movimientos + medicamentos + audit;
  }, []);

  const hasPending = (pendingCount || 0) > 0;

  return (
    <div className="hidden md:block fixed top-4 right-4 z-50">
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl p-2 flex items-center gap-2 shadow-lg border border-slate-200 dark:border-slate-800">
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${isOnline ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          {isOnline ? <Cloud size={14} /> : <CloudOff size={14} />}
        </div>

        <div className="flex items-center gap-2 pr-2">
          {hasPending ? (
            <AnimatePresence mode="wait">
              <motion.div
                key="pending"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 5 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                <RefreshCw size={12} className="text-amber-500 animate-spin" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {pendingCount}
                </span>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-teal-500" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Sync OK
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
