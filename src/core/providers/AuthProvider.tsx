"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/core/db/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/core/db";
import { syncService } from "@/core/db/sync";
import type { Perfil, RolUsuario } from "@/features/usuarios/types";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AuthContextType {
  /** Usuario autenticado de Supabase */
  user: User | null;
  /** Sesión activa de Supabase */
  session: Session | null;
  /** Perfil completo de public.perfiles (reactivo vía Dexie) */
  perfil: Perfil | null | undefined;
  /** Rol del usuario: 'admin' | 'personal' | null */
  role: RolUsuario | null;
  /**
   * ID de la institución. Regla de Oro #1: filtrar TODA consulta por este valor.
   * Es null mientras el perfil no se haya sincronizado.
   */
  businessId: string | null;
  /** true mientras se resuelve la sesión inicial */
  isLoading: boolean;
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  perfil: null,
  role: null,
  businessId: null,
  isLoading: true,
  signOut: async () => { },
});

export const useAuth = (): AuthContextType => useContext(AuthContext);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Reactivo: se actualiza automáticamente cuando el SyncService escribe el perfil en Dexie.
  // Esto garantiza que businessId esté disponible incluso en modo offline (tras primera sync).
  const perfil = useLiveQuery<Perfil | undefined>(async () => {
    if (!user?.email) return undefined;
    return db.perfiles.where("email").equals(user.email).first();
  }, [user?.email]);

  const role = perfil?.rol ?? null;
  const businessId = perfil?.business_id ?? null;

  // Validar que el usuario esté activo y no eliminado
  useEffect(() => {
    if (perfil && (!perfil.activo || perfil.deleted_at)) {
      console.warn('[AuthProvider] Usuario inactivo o eliminado, cerrando sesión');
      supabase.auth.signOut();
      setUser(null);
      setSession(null);
    }
  }, [perfil]);

  useEffect(() => {
    // Resuelve la sesión persistida en localStorage al cargar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Escucha cambios en la sesión (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // Al hacer login, obtener perfil de Supabase si no existe en Dexie
      if (_event === 'SIGNED_IN' && session?.user) {
        setTimeout(async () => {
          try {
            // Verificar si el perfil ya existe en Dexie
            const localPerfil = await db.perfiles.where('email').equals(session.user.email!).first();

            if (!localPerfil) {
              // Perfil no existe en Dexie - limpiar solo datos corruptos
              console.log('[AuthProvider] Primer login - limpiando datos corruptos');

              // Eliminar programas locales para forzar PULL desde Supabase
              await db.programas_estudio.clear();
              console.log('[AuthProvider] Programas locales eliminados');

              // Eliminar pacientes con programa_id inválido
              const pacientes = await db.pacientes.toArray();
              console.log(`[AuthProvider] Total pacientes: ${pacientes.length}`);
              const pacientesCorruptos = pacientes.filter((p: any) => p.programa_id);
              console.log(`[AuthProvider] Pacientes con programa_id: ${pacientesCorruptos.length}`);

              if (pacientesCorruptos.length > 0) {
                console.log(`[AuthProvider] Eliminando ${pacientesCorruptos.length} pacientes corruptos`);
                const pacienteIds = pacientesCorruptos.map((p: any) => p.id);
                await db.pacientes.bulkDelete(pacienteIds);
              }

              // Perfil no existe en Dexie, obtener de Supabase
              const { data: remotePerfil, error: perfilError } = await supabase
                .from('perfiles')
                .select('*')
                .eq('email', session.user.email!)
                .maybeSingle();

              if (perfilError) {
                console.warn('[AuthProvider] Error obteniendo perfil de Supabase:', perfilError);
                return;
              }

              if (remotePerfil?.business_id) {
                // Ejecutar PULL inicial para descargar todos los datos
                await syncService.pullFromSupabase(remotePerfil.business_id);
              }
            }
          } catch (error) {
            console.error('[AuthProvider] Error en PULL inicial:', error);
          }
        }, 500);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{ user, session, perfil, role, businessId, isLoading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
