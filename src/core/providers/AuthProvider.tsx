"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/core/db/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/core/db";
import { syncService } from "@/core/services/syncService";
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
  /** true mientras se está sincronizando datos iniciales */
  isInitialSync: boolean;
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
  isInitialSync: false,
  signOut: async () => { },
});

export const useAuth = (): AuthContextType => useContext(AuthContext);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialSync, setIsInitialSync] = useState(false);
  const [hasInitialPull, setHasInitialPull] = useState(false);
  const router = useRouter();

  // Reactivo: se actualiza automáticamente cuando el SyncService escribe el perfil en Dexie.
  // Esto garantiza que businessId esté disponible incluso en modo offline (tras primera sync).
  const perfil = useLiveQuery<Perfil | undefined>(async () => {
    if (!user?.email) return undefined;
    return db.perfiles.where("email").equals(user.email).first();
  }, [user?.email]);

  const role = perfil?.rol ?? null;
  const businessId = perfil?.business_id ?? null;

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

      // Al hacer login, ejecutar PULL inicial si no se ha hecho
      if (_event === 'SIGNED_IN' && session?.user && !hasInitialPull) {
        setTimeout(async () => {
          try {
            // Obtener perfil de Supabase para conseguir business_id
            const { data: perfiles } = await supabase
              .from('perfiles')
              .select('*')
              .eq('email', session.user.email!)
              .single();

            if (perfiles?.business_id) {
              setIsInitialSync(true);
              await syncService.pullFromSupabase(perfiles.business_id);
              setHasInitialPull(true);
            }
          } catch (error) {
            console.error('[AuthProvider] Error en PULL inicial:', error);
          } finally {
            setIsInitialSync(false);
          }
        }, 500);
      }
    });

    return () => subscription.unsubscribe();
  }, [hasInitialPull]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{ user, session, perfil, role, businessId, isLoading, isInitialSync, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
