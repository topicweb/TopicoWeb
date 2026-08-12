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
    <div className="flex h-screen overflow-hidden bg-[var(--muted)]">
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-y-auto scroll-smooth p-4 pb-24 md:p-6 md:pl-72 md:pb-4">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>

      <BottomNav />
    </div>
  );
}
