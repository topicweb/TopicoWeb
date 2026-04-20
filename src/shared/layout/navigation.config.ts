/**
 * Configuración centralizada de navegación
 * - Single source of truth para Sidebar (desktop) y BottomNav (mobile)
 * - Cambios aquí se reflejan automáticamente en ambas vistas
 */

import {
  Users,
  Package,
  ArrowRightLeft,
  ClipboardPlus,
  LayoutDashboard,
  ShieldCheck,
  LucideIcon,
} from "lucide-react";

export interface MenuItem {
  href: string;
  icon: LucideIcon;
  label: string;
  labelShort?: string;  // Versión corta para mobile bottom nav
  highlight?: boolean;  // Destacar visualmente (ej: "Nueva Atención")
  adminOnly?: boolean; // Visible solo para admins
  /** Para MobileMenuSheet - descripción del item */
  description?: string;
  /** Para MobileMenuSheet - colores del icono */
  color?: string;
  bgColor?: string;
}

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
