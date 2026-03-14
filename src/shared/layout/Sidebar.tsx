"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Users,
  Package,
  ArrowRightLeft,
  ClipboardPlus,
  X,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/core/providers/AuthProvider";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();

  const menuItems = [
    { href: "/dashboard", icon: Activity, label: "Panel Principal" },
    { href: "/dashboard/users", icon: Users, label: "Usuarios" },
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
    <>
      {/* Backdrop para móvil (Fondo oscuro al abrir menú) */}
      <div
        className={`fixed inset-0 z-20 bg-black/50 transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 flex h-full flex-col bg-blue-900 text-white transition-all duration-300 ease-in-out
          overflow-hidden shadow-xl md:shadow-none
          md:relative
          ${isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 md:w-0 md:translate-x-0"}
        `}
      >
        {/* Área superior con scroll si es necesario */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-blue-700/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-blue-600">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Activity size={32} className="text-blue-300 shrink-0" />
                <div className="min-w-max">
                  <h1 className="text-xl font-bold">Sistema Tópico</h1>
                  <p className="text-xs text-blue-300">Gestión Integral</p>
                </div>
              </div>
              {/* Botón de cerrar solo visible en móvil */}
              <button
                onClick={onClose}
                className="md:hidden text-blue-300 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <nav className="space-y-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => window.innerWidth < 768 && onClose?.()} // Cerrar al hacer clic en móvil
                    aria-current={isActive ? "page" : undefined}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition whitespace-nowrap ${
                      isActive ? "bg-blue-800" : "hover:bg-blue-800"
                    }`}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer fijo abajo */}
        <div className="p-6 bg-blue-950 shrink-0 border-t border-blue-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center shrink-0 text-sm">
                <span className="font-semibold">
                  {(user?.email || "U").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 overflow-hidden">
                <p
                  className="font-semibold text-sm truncate"
                  title={user?.email}
                >
                  {user?.email?.split("@")[0] || "Usuario"}
                </p>
                <p className="text-xs text-blue-300 capitalize">
                  {role || "Cargando..."}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 text-blue-300 hover:text-white hover:bg-blue-800 rounded-lg transition-colors shrink-0"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
