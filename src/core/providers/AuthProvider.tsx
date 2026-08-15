"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/core/db/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/core/db";
import { syncService } from "@/core/db/sync";
import { logger } from "@/core/utils/logger";
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

/** Migra sesión del cliente antiguo (localStorage) al nuevo basado en cookies. */
async function migrateLegacyLocalStorageSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return;

  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const raw = localStorage.getItem(storageKey);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as {
      access_token?: string;
      refresh_token?: string;
      currentSession?: { access_token?: string; refresh_token?: string };
    };
    const access_token = parsed.access_token ?? parsed.currentSession?.access_token;
    const refresh_token = parsed.refresh_token ?? parsed.currentSession?.refresh_token;

    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token });
    }
  } catch {
    // Sesión legacy corrupta; el usuario deberá iniciar sesión de nuevo.
  }
}

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
      logger.warn('[AuthProvider] Usuario inactivo o eliminado, cerrando sesión');
      supabase.auth.signOut();
      setUser(null);
      setSession(null);
    }
  }, [perfil]);

  useEffect(() => {
    // Migra sesión legacy y resuelve la sesión en cookies
    migrateLegacyLocalStorageSession()
      .then(() => supabase.auth.getSession())
      .then(({ data: { session } }) => {
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
              logger.debug('[AuthProvider] Primer login - limpiando datos corruptos');

              // Eliminar programas locales para forzar PULL desde Supabase
              await db.programas_estudio.clear();
              logger.debug('[AuthProvider] Programas locales eliminados');

              // Eliminar pacientes con programa_id inválido
              const pacientes = await db.pacientes.toArray();
              logger.debug(`[AuthProvider] Total pacientes: ${pacientes.length}`);
              const pacientesCorruptos = pacientes.filter((p: any) => p.programa_id);
              logger.debug(`[AuthProvider] Pacientes con programa_id: ${pacientesCorruptos.length}`);

              if (pacientesCorruptos.length > 0) {
                logger.debug(`[AuthProvider] Eliminando ${pacientesCorruptos.length} pacientes corruptos`);
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
                logger.warn('[AuthProvider] Error obteniendo perfil de Supabase:', perfilError);
                return;
              }

              if (remotePerfil?.business_id) {
                // Ejecutar PULL inicial para descargar todos los datos
                await syncService.pullFromSupabase(remotePerfil.business_id);
              }
            }
          } catch (error) {
            logger.error('[AuthProvider] Error en PULL inicial:', error);
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
