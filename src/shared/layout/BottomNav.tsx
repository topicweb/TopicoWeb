"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileMenuSheet } from "./MobileMenuSheet";
import { primaryMenuItems } from "./navigation.config";

// ───────────────────────────────────────────────────────────────────────────────
// NAVEGACIÓN INFERIOR (MÓVIL)
// Barra de navegación fija en la parte inferior para dispositivos móviles
// ───────────────────────────────────────────────────────────────────────────────

const navItemBase =
  "flex flex-col items-center justify-center min-w-14 py-2 px-1 rounded-xl transition-all duration-200";

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(15,23,42,0.08)] backdrop-blur-lg">
        <div className="flex items-center justify-around">
          {primaryMenuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${navItemBase} ${
                  isActive
                    ? item.highlight
                      ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25"
                      : "bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Icon
                  size={22}
                  className={
                    isActive && !item.highlight ? "text-[var(--primary)]" : ""
                  }
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="text-[10px] font-medium mt-0.5 leading-tight">
                  {item.labelShort || item.label}
                </span>
              </Link>
            );
          })}

          <MobileMenuSheet />
        </div>
      </div>
    </nav>
  );
};
