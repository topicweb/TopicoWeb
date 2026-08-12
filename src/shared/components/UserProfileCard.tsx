"use client";

import { LogOut } from "lucide-react";

// ───────────────────────────────────────────────────────────────────────────────
// TARJETA DE PERFIL DE USUARIO
// Reutilizable entre Sidebar y MobileMenuSheet para consistencia visual
// ───────────────────────────────────────────────────────────────────────────────

interface UserProfileCardProps {
  email?: string | null;
  role?: string | null;
  onSignOut?: () => void;
  variant?: "compact" | "expanded";
}

const avatarClass =
  "flex shrink-0 items-center justify-center rounded-xl border border-[var(--primary)]/15 bg-[var(--primary-soft)] font-bold uppercase text-[var(--primary)]";

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
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <div className={`${avatarClass} h-12 w-12 text-lg`}>
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-slate-900">{displayName}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              {role || "Personal"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`${avatarClass} h-10 w-10 text-sm`}>
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{displayName}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {role || "Personal"}
            </p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          disabled={!onSignOut}
          className="rounded-lg p-2 text-slate-400 transition-all hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
          title="Cerrar Sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
};
