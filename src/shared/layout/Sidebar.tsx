"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/core/providers/AuthProvider";
import { SyncMonitor } from "@/shared/components/SyncMonitor";
import { UserProfileCard } from "@/shared/components/UserProfileCard";
import { primaryMenuItems, secondaryMenuItems } from "./navigation.config";

// ───────────────────────────────────────────────────────────────────────────────
// SIDEBAR (DESKTOP)
// Barra lateral de navegación fija para pantallas de escritorio
// ───────────────────────────────────────────────────────────────────────────────

const navLinkBase =
  "group w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 whitespace-nowrap text-base font-medium";

export const Sidebar = () => {
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();
  const menuItems = [...primaryMenuItems, ...secondaryMenuItems];

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 h-full w-64 flex-col bg-white text-slate-600 border-r border-slate-200 shadow-sm">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
              <img
                src="/logo.webp"
                alt="Logo Tópico"
                className="h-7 w-7 object-contain"
              />
            </div>
            <div className="min-w-max">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Tópico
              </h1>
              <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-widest -mt-1">
                Servicio Médico
              </p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${navLinkBase} ${
                    isActive
                      ? "bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary)]/20 font-semibold shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <item.icon
                    size={20}
                    className={
                      isActive
                        ? "text-[var(--primary)]"
                        : "text-slate-400 group-hover:text-[var(--primary)] transition-colors"
                    }
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="px-4 pb-2">
        <SyncMonitor variant="inline" />
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <UserProfileCard
          email={user?.email}
          role={role}
          onSignOut={signOut}
          variant="compact"
        />
      </div>
    </aside>
  );
};
