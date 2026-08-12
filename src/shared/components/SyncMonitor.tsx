"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/core/db";
import { useNetwork } from "@/core/providers/NetworkProvider";
import { useBidirectionalSync } from "@/core/hooks/useBidirectionalSync";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from "lucide-react";

// ───────────────────────────────────────────────────────────────────────────────
// MONITOR DE SINCRONIZACIÓN
// Indicador de estado de red y cambios pendientes. Crítico en entorno médico
// ───────────────────────────────────────────────────────────────────────────────

interface SyncMonitorProps {
  variant?: "fixed" | "inline";
}

export const SyncMonitor = ({ variant = "fixed" }: SyncMonitorProps) => {
  const { isOnline } = useNetwork();
  const { forceSync, isSyncing } = useBidirectionalSync();

  const pendingCount = useLiveQuery(async () => {
    const [pacientes, atenciones, movimientos, medicamentos] = await Promise.all([
      db.pacientes.where("sync_status").equals("pending").count(),
      db.atenciones.where("sync_status").equals("pending").count(),
      db.movimientos_stock.where("sync_status").equals("pending").count(),
      db.medicamentos.where("sync_status").equals("pending").count(),
    ]);
    return pacientes + atenciones + movimientos + medicamentos;
  }, []);

  const hasPending = (pendingCount || 0) > 0;

  const containerClasses =
    variant === "fixed"
      ? "hidden md:block fixed top-4 right-4 z-50"
      : "w-full";

  const handleSyncClick = () => {
    if (isOnline && hasPending) {
      console.log('[SyncMonitor] 🔄 Forzando sincronización manual');
      forceSync();
    }
  };

  return (
    <div className={containerClasses}>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            isOnline
              ? "bg-[var(--accent-soft)] text-[var(--accent)]"
              : "bg-[var(--danger-soft)] text-[var(--danger)]"
          }`}
        >
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
                className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-[var(--primary-soft)]"
                onClick={handleSyncClick}
                title={isOnline ? "Click para sincronizar" : "Sin conexión"}
              >
                <RefreshCw
                  size={12}
                  className={`text-[var(--warning)] ${isSyncing ? "animate-spin" : ""}`}
                />
                <span className="text-xs font-semibold text-slate-700">
                  {pendingCount}
                </span>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-[var(--accent)]" />
              <span className="text-xs font-medium text-slate-500">Sync OK</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
