"use client";

/**
 * Layout del route group (auth).
 * Si el usuario ya está autenticado Y tiene business_id asignado,
 * redirige automáticamente al dashboard para evitar mostrar el login.
 */
import { useAuth } from "@/core/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, businessId, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && businessId) {
      router.replace("/dashboard");
    }
  }, [user, businessId, isLoading, router]);

  // Mientras se resuelve la sesión no renderizamos nada
  // (evita el flash del formulario de login si ya está autenticado)
  if (isLoading) return null;

  return <>{children}</>;
}
