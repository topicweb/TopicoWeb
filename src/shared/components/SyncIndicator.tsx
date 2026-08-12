"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/core/db";
import { useNetwork } from "@/core/providers/NetworkProvider";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";

// ───────────────────────────────────────────────────────────────────────────────
// INDICADOR DE SINCRONIZACIÓN
// Muestra estado de conexión y cantidad de cambios pendientes de sincronizar
// ───────────────────────────────────────────────────────────────────────────────

interface SyncIndicatorProps {
  size?: "sm" | "md" | "lg";
}

export const SyncIndicator = ({ size = "md" }: SyncIndicatorProps) => {
  const { isOnline } = useNetwork();

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

  const sizeClasses = {
    sm: { icon: 16, container: "h-7 w-7" },
    md: { icon: 20, container: "h-8 w-8" },
    lg: { icon: 24, container: "h-9 w-9" },
  };

  const { icon, container } = sizeClasses[size];

  const onlineIconClass = isOnline
    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
    : "bg-[var(--danger-soft)] text-[var(--danger)]";

  if (size === "sm") {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div
          className={`${container} flex items-center justify-center rounded-lg ${onlineIconClass}`}
        >
          {isOnline ? (
            hasPending ? (
              <RefreshCw size={icon} className="animate-spin text-[var(--warning)]" />
            ) : (
              <Cloud size={icon} />
            )
          ) : (
            <CloudOff size={icon} />
          )}
        </div>
        <span className="text-[9px] leading-none text-slate-500">
          {isOnline ? (hasPending ? `${pendingCount} sync` : "Online") : "Offline"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${container} flex items-center justify-center rounded-xl ${onlineIconClass}`}
      >
        {isOnline ? <Cloud size={icon} /> : <CloudOff size={icon} />}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {isOnline ? "Online" : "Offline"}
        </span>
        <span className="text-xs font-medium text-slate-700">
          {hasPending ? `${pendingCount} pendientes` : "Al día"}
        </span>
      </div>
    </div>
  );
};
