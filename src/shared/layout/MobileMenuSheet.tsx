"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  User,
  X,
  Wifi,
  WifiOff,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/core/providers/AuthProvider";
import { useNetwork } from "@/core/providers/NetworkProvider";
import { UserProfileCard } from "@/shared/components/UserProfileCard";
import { secondaryMenuItems } from "./navigation.config";

// ───────────────────────────────────────────────────────────────────────────────
// MENÚ DESLIZANTE MÓVIL
// Sheet desplegable desde abajo con opciones secundarias, perfil y logout
// ───────────────────────────────────────────────────────────────────────────────

export const MobileMenuSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();
  const { isOnline } = useNetwork();

  const handleSignOut = () => {
    setIsOpen(false);
    signOut();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex flex-col items-center justify-center min-w-14 py-2 px-1 rounded-xl transition-all duration-200 ${
          isOpen
            ? "bg-[var(--primary-soft)] text-[var(--primary)]"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        }`}
      >
        <div className="relative">
          <User
            size={22}
            strokeWidth={isOpen ? 2.5 : 2}
            className={isOpen ? "text-[var(--primary)]" : ""}
          />
          <span
            className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-white ${
              isOnline ? "bg-[var(--accent)]" : "bg-[var(--danger)]"
            }`}
          />
        </div>
        <span className="text-[10px] font-medium mt-0.5 leading-tight">Menú</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
          >
            <div className="rounded-t-3xl border-t border-slate-200 bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.12)]">
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-12 rounded-full bg-slate-200" />
              </div>

              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                      <img
                        src="/logo.webp"
                        alt="Logo Tópico"
                        className="h-7 w-7 object-contain"
                      />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900">Tópico</h2>
                      <div className="flex items-center gap-1.5">
                        {isOnline ? (
                          <>
                            <Wifi size={12} className="text-[var(--accent)]" />
                            <span className="text-xs font-medium text-[var(--accent)]">
                              En línea
                            </span>
                          </>
                        ) : (
                          <>
                            <WifiOff size={12} className="text-[var(--danger)]" />
                            <span className="text-xs font-medium text-[var(--danger)]">
                              Sin conexión
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="px-5 py-4">
                <UserProfileCard
                  email={user?.email}
                  role={role}
                  variant="expanded"
                />
              </div>

              <div className="px-5 pb-2">
                <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Opciones
                </p>
                <div className="space-y-1">
                  {secondaryMenuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                          isActive
                            ? "border-[var(--primary)]/20 bg-[var(--primary-soft)]"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            isActive
                              ? "bg-[var(--primary)]/15"
                              : "bg-[var(--accent-soft)]"
                          }`}
                        >
                          <item.icon
                            size={20}
                            className={
                              isActive
                                ? "text-[var(--primary)]"
                                : "text-[var(--accent)]"
                            }
                          />
                        </div>
                        <div className="flex-1">
                          <p
                            className={`font-semibold ${
                              isActive ? "text-[var(--primary)]" : "text-slate-900"
                            }`}
                          >
                            {item.label}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.description}
                          </p>
                        </div>
                        <ChevronRight size={18} className="text-slate-400" />
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-200 px-5 py-4">
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-[var(--danger)] transition-all hover:bg-red-100 active:scale-[0.98]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--danger)]/10">
                    <LogOut size={20} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">Cerrar Sesión</p>
                    <p className="text-xs opacity-80">Finalizar sesión actual</p>
                  </div>
                </button>
              </div>

              <div className="h-[env(safe-area-inset-bottom)]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
