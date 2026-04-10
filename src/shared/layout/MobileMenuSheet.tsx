"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  LogOut,
  User,
  X,
  Wifi,
  WifiOff,
  ChevronRight,
  Stethoscope,
} from "lucide-react";
import { useAuth } from "@/core/providers/AuthProvider";
import { useNetwork } from "@/core/providers/NetworkProvider";

export const MobileMenuSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();
  const { isOnline } = useNetwork();

  const handleSignOut = () => {
    setIsOpen(false);
    signOut();
  };

  const menuItems = [
    {
      href: "/dashboard/users",
      icon: ShieldCheck,
      label: "Usuarios",
      description: "Gestionar equipo",
      color: "text-indigo-400",
      bgColor: "bg-indigo-400/10",
    },
  ];

  return (
    <>
      {/* Menu Button in BottomNav */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex flex-col items-center justify-center min-w-14 py-2 px-1 rounded-xl transition-all duration-200 ${
          isOpen
            ? "bg-slate-700 text-white"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <div className="relative">
          <User
            size={22}
            strokeWidth={isOpen ? 2.5 : 2}
            className={isOpen ? "text-teal-400" : ""}
          />
          {/* Online indicator dot */}
          <span
            className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-slate-900 ${
              isOnline ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
        </div>
        <span className="text-[10px] font-medium mt-0.5 leading-tight">Menú</span>
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sheet */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
          >
            <div className="bg-slate-900 rounded-t-3xl border-t border-slate-800 shadow-2xl shadow-slate-950/50">
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-12 rounded-full bg-slate-700" />
              </div>

              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-600/20">
                      <Stethoscope size={20} />
                    </div>
                    <div>
                      <h2 className="font-bold text-white">Tópico</h2>
                      <div className="flex items-center gap-1.5">
                        {isOnline ? (
                          <>
                            <Wifi size={12} className="text-emerald-400" />
                            <span className="text-xs text-emerald-400">En línea</span>
                          </>
                        ) : (
                          <>
                            <WifiOff size={12} className="text-rose-400" />
                            <span className="text-xs text-rose-400">Sin conexión</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* User Profile Card */}
              <div className="px-5 py-4">
                <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-teal-600/20 rounded-xl flex items-center justify-center shrink-0 text-teal-400 border border-teal-600/20">
                      <span className="font-bold text-lg uppercase">
                        {(user?.email || "U").charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">
                        {user?.email?.split("@")[0] || "Usuario"}
                      </p>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">
                        {role || "Personal"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="px-5 pb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">
                  Opciones
                </p>
                <div className="space-y-1">
                  {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                          isActive
                            ? "bg-indigo-600/20 border border-indigo-600/30"
                            : "bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800"
                        }`}
                      >
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                            isActive ? "bg-indigo-600/30" : item.bgColor
                          }`}
                        >
                          <item.icon
                            size={20}
                            className={isActive ? "text-indigo-400" : item.color}
                          />
                        </div>
                        <div className="flex-1">
                          <p
                            className={`font-semibold ${
                              isActive ? "text-indigo-300" : "text-white"
                            }`}
                          >
                            {item.label}
                          </p>
                          <p className="text-xs text-slate-400">{item.description}</p>
                        </div>
                        <ChevronRight size={18} className="text-slate-500" />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Logout Button */}
              <div className="px-5 py-4 border-t border-slate-800">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all active:scale-[0.98]"
                >
                  <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                    <LogOut size={20} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">Cerrar Sesión</p>
                    <p className="text-xs text-rose-400/70">
                      Finalizar sesión actual
                    </p>
                  </div>
                </button>
              </div>

              {/* Safe area padding */}
              <div className="h-[env(safe-area-inset-bottom)]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
