// ───────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE NAVEGACIÓN
// Single source of truth para Sidebar (desktop) y BottomNav (mobile)
// ───────────────────────────────────────────────────────────────────────────────

import {
  Users,
  Package,
  ArrowRightLeft,
  ClipboardPlus,
  LayoutDashboard,
  ShieldCheck,
  LucideIcon,
} from "lucide-react";

// ───────────────────────────────────────────────────────────────────────────────
// Interfaz de Item de Menú
// ───────────────────────────────────────────────────────────────────────────────
export interface MenuItem {
  href: string;
  icon: LucideIcon;
  label: string;
  labelShort?: string;
  highlight?: boolean;
  adminOnly?: boolean;
  description?: string;
  color?: string;
  bgColor?: string;
}

// ───────────────────────────────────────────────────────────────────────────────
// Items de Menú Primarios
// Visibles en Sidebar y BottomNav
// ───────────────────────────────────────────────────────────────────────────────
export const primaryMenuItems: MenuItem[] = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Panel Principal",
    labelShort: "Panel",
  },
  {
    href: "/dashboard/patients",
    icon: Users,
    label: "Pacientes",
  },
  {
    href: "/dashboard/attentions/new",
    icon: ClipboardPlus,
    label: "Nueva Atención",
    labelShort: "Nueva",
    highlight: true,
  },
  {
    href: "/dashboard/inventory",
    icon: Package,
    label: "Inventario",
    labelShort: "Stock",
  },
  {
    href: "/dashboard/movements",
    icon: ArrowRightLeft,
    label: "Movimientos",
  },
];

// ───────────────────────────────────────────────────────────────────────────────
// Items de Menú Secundarios
// Visibles solo en MobileMenuSheet
// ───────────────────────────────────────────────────────────────────────────────
export const secondaryMenuItems: MenuItem[] = [
  {
    href: "/dashboard/users",
    icon: ShieldCheck,
    label: "Usuarios",
    adminOnly: true,
    description: "Gestionar equipo médico",
    color: "text-indigo-400",
    bgColor: "bg-indigo-400/10",
  },
];
