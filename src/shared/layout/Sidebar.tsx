"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stethoscope } from "lucide-react";
import { useAuth } from "@/core/providers/AuthProvider";
import { SyncMonitor } from "@/shared/components/SyncMonitor";
import { UserProfileCard } from "@/shared/components/UserProfileCard";
import { primaryMenuItems, secondaryMenuItems } from "./navigation.config";

export const Sidebar = () => {
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();

  // Combinar items primarios y secundarios para desktop
  const menuItems = [...primaryMenuItems, ...secondaryMenuItems];

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 h-full w-64 flex-col bg-slate-950 text-slate-400 border-r border-slate-800">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-600/20">
              <Stethoscope size={22} />
            </div>
            <div className="min-w-max">
              <h1 className="text-lg font-bold text-white tracking-tight">Tópico</h1>
              <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest -mt-1">Servicio Médico</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 whitespace-nowrap text-base font-medium ${isActive
                    ? "bg-teal-600/10 text-teal-400 border border-teal-600/20 font-semibold"
                    : "hover:bg-slate-900 hover:text-white"
                    }`}
                >
                  <item.icon size={20} className={isActive ? "text-teal-500" : "text-slate-500 group-hover:text-teal-400 transition-colors"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Estado de sincronización - Siempre visible en sidebar */}
      <div className="px-4 pb-2">
        <SyncMonitor variant="inline" />
      </div>

      <div className="p-4 border-t border-slate-900">
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
