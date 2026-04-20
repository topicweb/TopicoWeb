"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileMenuSheet } from "./MobileMenuSheet";
import { primaryMenuItems } from "./navigation.config";

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around">
          {primaryMenuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-14 py-2 px-1 rounded-xl transition-all duration-200 ${isActive
                  ? item.highlight
                    ? "bg-teal-600 text-white shadow-lg shadow-teal-600/25"
                    : "bg-teal-600/10 text-teal-400"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                <Icon
                  size={22}
                  className={isActive && !item.highlight ? "text-teal-500" : ""}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="text-[10px] font-medium mt-0.5 leading-tight">
                  {item.labelShort || item.label}
                </span>
              </Link>
            );
          })}

          {/* Mobile Menu Sheet Trigger (Usuarios + Logout + Sync) */}
          <MobileMenuSheet />
        </div>
      </div>
    </nav>
  );
}
