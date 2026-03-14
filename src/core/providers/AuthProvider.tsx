"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/core/db/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/core/db";
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
  signOut: async () => {},
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
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
