"use client";

import { useAuth } from "@/core/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import MainLayout from "@/shared/layout/MainLayout";

// ───────────────────────────────────────────────────────────────────────────────
// DASHBOARD GUARD
// Protege rutas del dashboard y asegura business_id para operaciones
// ───────────────────────────────────────────────────────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, businessId, isLoading } = useAuth();
  const router = useRouter();

  // Redirigir si no hay sesión activa
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  // Estado de carga: sincronizando perfil o business_id
  if (isLoading || (user && !businessId)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 flex-col gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="text-slate-400 font-medium">Sincronizando perfil seguro...</p>
      </div>
    );
  }

  // Abortar si faltan credenciales requeridas
  if (!user || !businessId) return null;

  return <MainLayout>{children}</MainLayout>;
}
