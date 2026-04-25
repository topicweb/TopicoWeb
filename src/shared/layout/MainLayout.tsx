"use client";

import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

// ───────────────────────────────────────────────────────────────────────────────
// LAYOUT PRINCIPAL
// Estructura base de la aplicación con Sidebar (desktop) y BottomNav (móvil)
// ───────────────────────────────────────────────────────────────────────────────

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar - Desktop Only */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-w-0 p-4 md:p-6 md:pl-72 scroll-smooth pb-24 md:pb-4">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNav />
    </div>
  );
}
