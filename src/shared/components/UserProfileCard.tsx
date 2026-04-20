"use client";

import { LogOut } from "lucide-react";

interface UserProfileCardProps {
  email?: string | null;
  role?: string | null;
  /** Requerido para variant='compact', no se usa en 'expanded' */
  onSignOut?: () => void;
  /** 'compact' = Sidebar style con botón logout, 'expanded' = Mobile Sheet style solo info */
  variant?: "compact" | "expanded";
}

/**
 * Card de perfil de usuario - Reutilizable entre Sidebar y MobileMenuSheet
 * Mantiene consistencia visual en toda la aplicación
 */
export const UserProfileCard = ({
  email,
  role,
  onSignOut,
  variant = "compact",
}: UserProfileCardProps) => {
  const initial = (email || "U").charAt(0).toUpperCase();
  const displayName = email?.split("@")[0] || "Usuario";

  if (variant === "expanded") {
    return (
      <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-teal-600/20 rounded-xl flex items-center justify-center shrink-0 text-teal-400 border border-teal-600/20">
            <span className="font-bold text-lg uppercase">{initial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white truncate">{displayName}</p>
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              {role || "Personal"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Compact variant (Sidebar)
  return (
    <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800/50">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-teal-600/20 rounded-lg flex items-center justify-center shrink-0 text-teal-400 border border-teal-600/10">
            <span className="font-bold text-sm uppercase">{initial}</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-white truncate">{displayName}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {role || "Personal"}
            </p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          disabled={!onSignOut}
          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Cerrar Sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
};
