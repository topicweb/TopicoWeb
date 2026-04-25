"use client";

import { useAuth } from "@/core/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// ───────────────────────────────────────────────────────────────────────────────
// AUTH LAYOUT GUARD
// Redirige usuarios autenticados al dashboard y evita flash de login
// ───────────────────────────────────────────────────────────────────────────────

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, businessId, isLoading } = useAuth();
  const router = useRouter();

  // Redirigir si ya está autenticado con tenant asignado
  useEffect(() => {
    if (!isLoading && user && businessId) {
      router.replace("/dashboard");
    }
  }, [user, businessId, isLoading, router]);

  // Evitar flash del login mientras carga la sesión
  if (isLoading) return null;

  return <>{children}</>;
}
