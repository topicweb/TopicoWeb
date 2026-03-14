"use client";

/**
 * Layout protector del route group (dashboard).
 * Verifica la existencia de `businessId` — no solo de `user` —
 * cumpliendo la Regla de Oro #1 del spec: toda operación requiere business_id.
 */
import { useAuth } from "@/core/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, DatabaseZap } from "lucide-react";
import MainLayout from "@/shared/layout/MainLayout";
import { useInitialSync } from "@/core/hooks/useInitialSync";
import { seedDatabase } from "@/shared/utils/seedData";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, businessId, isLoading } = useAuth();
  const router = useRouter();

  // Ejecuta la sincronización en cuanto exista el usuario, para descargar su perfil y businessId
  useInitialSync(!!user);

  useEffect(() => {
    // Si ya estamos seguros de que no hay usuario de Supabase, lo botamos
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  // Si estamos cargando la sesión, o si tenemos usuario pero aún Dexie no nos
  // ha entregado el businessId (está sincronizando el perfil), mostramos spinner.
  if (isLoading || (user && !businessId)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 flex-col gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="text-slate-400 font-medium">Sincronizando perfil seguro...</p>
        
        {/* Fallback temporal para usuarios nuevos que aún no tienen business_id */}
        {user && !isLoading && !businessId && (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-700 p-6 bg-slate-800/50">
            <p className="text-sm text-slate-400 text-center max-w-sm">
              ¿Es tu primera vez y la carga no avanza? Necesitas inicializar tu perfil y obtener un Business ID.
            </p>
            <button
              onClick={() => user.email && user.id && seedDatabase(user.email, user.id)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-indigo-700 transition"
            >
              <DatabaseZap size={18} />
              Generar Datos Iniciales (Demo)
            </button>
          </div>
        )}
      </div>
    );
  }

  // Si a pesar de todo no hay user o businessId aborta el render
  if (!user || !businessId) return null;

  return <MainLayout>{children}</MainLayout>;
}
