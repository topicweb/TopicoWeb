"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Package,
  ArrowRightLeft,
  ClipboardPlus,
  LogOut,
  Stethoscope,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/core/providers/AuthProvider";

export const Sidebar = () => {
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();

  const menuItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Panel Principal" },
    { href: "/dashboard/users", icon: ShieldCheck, label: "Usuarios" },
    { href: "/dashboard/patients", icon: Users, label: "Pacientes" },
    {
      href: "/dashboard/attentions/new",
      icon: ClipboardPlus,
      label: "Nueva Atención",
    },
    { href: "/dashboard/inventory", icon: Package, label: "Inventario" },
    {
      href: "/dashboard/movements",
      icon: ArrowRightLeft,
      label: "Movimientos",
    },
  ];

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

      <div className="p-4 border-t border-slate-900">
        <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-teal-600/20 rounded-lg flex items-center justify-center shrink-0 text-teal-400 border border-teal-600/10">
                <span className="font-bold text-sm uppercase">
                  {(user?.email || "U").charAt(0)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-white truncate">
                  {user?.email?.split("@")[0] || "Usuario"}
                </p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {role || "Personal"}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
              title="Cerrar Sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
