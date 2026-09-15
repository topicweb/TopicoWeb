"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/core/db/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/core/db";
import { syncService } from "@/core/db/sync";
import { logger } from "@/core/utils/logger";
import { isPerfilValido, normalizePerfilFromSupabase } from "@/shared/utils/perfil";
import type { Perfil, RolUsuario } from "@/features/usuarios/types";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  session: Session | null;
  perfil: Perfil | null | undefined;
  role: RolUsuario | null;
  businessId: string | null;
  isLoading: boolean;
  /** Solo true en el primer arranque sin perfil local válido (no al cambiar de pestaña). */
  isInitialPerfilLoad: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  perfil: null,
  role: null,
  businessId: null,
  isLoading: true,
  isInitialPerfilLoad: false,
  signOut: async () => { },
});

export const useAuth = (): AuthContextType => useContext(AuthContext);

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
    // Sesión legacy corrupta.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialPerfilLoad, setIsInitialPerfilLoad] = useState(false);
  const [cachedBusinessId, setCachedBusinessId] = useState<string | null>(null);
  const router = useRouter();

  const hydratedUserIdRef = useRef<string | null>(null);
  const hydratingRef = useRef(false);
  const signOutRef = useRef<() => Promise<void>>(async () => { });

  const perfil = useLiveQuery<Perfil | undefined>(async () => {
    if (!user?.id) return undefined;
    return db.perfiles.get(user.id);
  }, [user?.id]);

  const role = perfil?.rol ?? null;
  const businessId = perfil?.business_id ?? cachedBusinessId;

  useEffect(() => {
    if (perfil?.business_id) {
      setCachedBusinessId(perfil.business_id);
    }
  }, [perfil?.business_id]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setCachedBusinessId(null);
    setIsInitialPerfilLoad(false);
    hydratedUserIdRef.current = null;
    router.push("/login");
  }, [router]);

  signOutRef.current = signOut;

  const rejectSession = useCallback(async (reason: string) => {
    logger.warn(`[AuthProvider] ${reason}`);
    await signOutRef.current();
  }, []);

  /** Refresca perfil en segundo plano sin bloquear la UI. */
  const refreshPerfilInBackground = useCallback(async (authUserId: string, businessId: string | null) => {
    if (!navigator.onLine) return;

    try {
      const { data: remotePerfil, error } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", authUserId)
        .maybeSingle();

      if (error || !remotePerfil) return;

      if (!isPerfilValido(remotePerfil as Perfil)) {
        await rejectSession("Usuario inactivo o eliminado, cerrando sesión");
        return;
      }

      await db.perfiles.put(normalizePerfilFromSupabase(remotePerfil as Record<string, unknown>));

      if (businessId) {
        await syncService.pullFromSupabase(businessId);
      }
    } catch (error) {
      logger.debug("[AuthProvider] Refresh de perfil en background omitido:", error);
    }
  }, [rejectSession]);

  /**
   * Resuelve el perfil al iniciar sesión o al arrancar la app.
   * Si ya hay perfil local válido → listo al instante (sin loader).
   * Solo bloquea UI cuando es el primer acceso sin datos locales.
   */
  const resolvePerfil = useCallback(async (authUser: User, isNewSignIn: boolean) => {
    if (hydratingRef.current) return;
    if (!isNewSignIn && hydratedUserIdRef.current === authUser.id) return;

    hydratingRef.current = true;

    try {
      const localPerfil = await db.perfiles.get(authUser.id);

      if (isPerfilValido(localPerfil)) {
        hydratedUserIdRef.current = authUser.id;
        if (localPerfil!.business_id) {
          setCachedBusinessId(localPerfil!.business_id);
        }
        setIsInitialPerfilLoad(false);
        void refreshPerfilInBackground(authUser.id, localPerfil!.business_id);
        return;
      }

      setIsInitialPerfilLoad(true);

      if (navigator.onLine) {
        const { data: remotePerfil, error } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        if (error) {
          await rejectSession(`Error obteniendo perfil: ${error.message}`);
          return;
        }

        if (!remotePerfil) {
          await rejectSession("Usuario sin perfil en el sistema. Contacte al administrador.");
          return;
        }

        if (!isPerfilValido(remotePerfil as Perfil)) {
          await rejectSession("Usuario inactivo o eliminado, cerrando sesión");
          return;
        }

        const normalized = normalizePerfilFromSupabase(remotePerfil as Record<string, unknown>);
        await db.perfiles.put(normalized);

        if (normalized.business_id) {
          setCachedBusinessId(normalized.business_id);
          await syncService.pullFromSupabase(normalized.business_id);
        }
      } else {
        await rejectSession("Se requiere conexión a internet para validar su perfil.");
        return;
      }

      hydratedUserIdRef.current = authUser.id;
    } catch (error) {
      logger.error("[AuthProvider] Error resolviendo perfil:", error);
      await rejectSession("No se pudo validar el perfil del usuario.");
    } finally {
      setIsInitialPerfilLoad(false);
      hydratingRef.current = false;
    }
  }, [refreshPerfilInBackground, rejectSession]);

  const resolvePerfilRef = useRef(resolvePerfil);
  resolvePerfilRef.current = resolvePerfil;

  useEffect(() => {
    if (hydratedUserIdRef.current !== user?.id) return;
    if (!perfil || isInitialPerfilLoad) return;

    if (!isPerfilValido(perfil)) {
      void rejectSession("Usuario inactivo o eliminado, cerrando sesión");
    }
  }, [perfil, user?.id, isInitialPerfilLoad, rejectSession]);

  // Suscripción de auth: montar una sola vez (evita re-hidratar al cambiar de pestaña).
  useEffect(() => {
    let mounted = true;

    void migrateLegacyLocalStorageSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (event === "SIGNED_OUT") {
        hydratedUserIdRef.current = null;
        setCachedBusinessId(null);
        setIsInitialPerfilLoad(false);
        return;
      }

      // Al volver a la pestaña Supabase refresca el token: no re-validar perfil.
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        return;
      }

      if (event === "SIGNED_IN" && session?.user) {
        // Supabase puede re-emitir SIGNED_IN al volver a la pestaña; ignorar si ya está listo.
        if (hydratedUserIdRef.current === session.user.id) return;
        await resolvePerfilRef.current(session.user, true);
        return;
      }

      if (event === "INITIAL_SESSION" && session?.user) {
        await resolvePerfilRef.current(session.user, false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        perfil,
        role,
        businessId,
        isLoading,
        isInitialPerfilLoad,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
