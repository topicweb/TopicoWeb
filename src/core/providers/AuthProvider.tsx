"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/core/db/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/core/db";
import { syncService } from "@/core/db/sync";
import { getDeviceId } from '@/core/utils/deviceId';
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

  const router = useRouter();

  const authEpoch = useRef(0);
  const currentUserRef = useRef<string | null>(null);
  const hydratedUserIdRef = useRef<string | null>(null);

  const signOutRef = useRef<() => Promise<void>>(async () => { });

  const perfil = useLiveQuery<Perfil | undefined>(async () => {
    if (!user?.id) return undefined;
    return db.perfiles.get(user.id);
  }, [user?.id]);

  const role = perfil?.rol ?? null;
  const businessId = perfil?.id === user?.id ? perfil?.business_id ?? null : null;



  const syncUserId = user?.id;
  const syncEligible = !!syncUserId && perfil?.id === syncUserId && isPerfilValido(perfil);
  useEffect(() => {
    syncService.setContext(syncEligible && syncUserId && businessId ? { userId: syncUserId, businessId, deviceId: getDeviceId() } : null);
    return () => syncService.setContext(null);
  }, [syncUserId, syncEligible, businessId]);
  const signOut = useCallback(async () => {
    authEpoch.current++;
    currentUserRef.current = null;
    syncService.setContext(null);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsInitialPerfilLoad(false);
    hydratedUserIdRef.current = null;
    router.push("/login");
  }, [router]);

  useEffect(() => { signOutRef.current = signOut; }, [signOut]);

  const rejectSession = useCallback(async (reason: string) => {
    logger.warn('auth.session_rejected');
    await signOutRef.current();
  }, []);

  /** Refresca perfil en segundo plano sin bloquear la UI. */
  const refreshPerfilInBackground = useCallback(async (authUserId: string) => {
    const epoch = authEpoch.current;
    if (!navigator.onLine) return;

    try {
      const { data: remotePerfil, error } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", authUserId)
        .maybeSingle();

      if (epoch !== authEpoch.current || currentUserRef.current !== authUserId || error || !remotePerfil) return;

      if (!isPerfilValido(remotePerfil as Perfil)) {
        await rejectSession("Usuario inactivo o eliminado, cerrando sesión");
        return;
      }

      await db.perfiles.put(normalizePerfilFromSupabase(remotePerfil as Record<string, unknown>));
    } catch (error) {
      logger.debug('auth.profile_refresh_skipped');
    }
  }, [rejectSession]);

  /**
   * Resuelve el perfil al iniciar sesión o al arrancar la app.
   * Si ya hay perfil local válido → listo al instante (sin loader).
   * Solo bloquea UI cuando es el primer acceso sin datos locales.
   */
  const resolvePerfil = useCallback(async (authUser: User, isNewSignIn: boolean) => {

    const epoch = authEpoch.current;
    if (!isNewSignIn && hydratedUserIdRef.current === authUser.id) return;


    try {
      const localPerfil = await db.perfiles.get(authUser.id);

      if (epoch !== authEpoch.current || currentUserRef.current !== authUser.id) return;
      if (isPerfilValido(localPerfil)) {
        hydratedUserIdRef.current = authUser.id;
        setIsInitialPerfilLoad(false);
        void refreshPerfilInBackground(authUser.id);
        return;
      }

      setIsInitialPerfilLoad(true);

      if (navigator.onLine) {
        const { data: remotePerfil, error } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        if (epoch !== authEpoch.current || currentUserRef.current !== authUser.id) return;
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
      } else {
        await rejectSession("Se requiere conexión a internet para validar su perfil.");
        return;
      }

      hydratedUserIdRef.current = authUser.id;
    } catch (error) {
      if (epoch !== authEpoch.current) return;
      logger.error('auth.profile_resolution_failed');
      await rejectSession("No se pudo validar el perfil del usuario.");
    } finally {
      setIsInitialPerfilLoad(false);
    }
  }, [refreshPerfilInBackground, rejectSession]);

  const resolvePerfilRef = useRef(resolvePerfil);
  useEffect(() => { resolvePerfilRef.current = resolvePerfil; }, [resolvePerfil]);

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

      if (currentUserRef.current !== (session?.user?.id ?? null)) { authEpoch.current++; syncService.setContext(null); }
      currentUserRef.current = session?.user?.id ?? null;
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (event === "SIGNED_OUT") {
        hydratedUserIdRef.current = null;
        setIsInitialPerfilLoad(false);
        return;
      }

      // Diferir llamadas a Supabase fuera del callback de Auth (evita bloquear su lock).
      if ((event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && session?.user) {
        const authUser = session.user;
        setTimeout(() => {
          if (!mounted || hydratedUserIdRef.current !== authUser.id) return;
          void db.perfiles.get(authUser.id).then(local => {
            if (!mounted || hydratedUserIdRef.current !== authUser.id) return;
            if (event === 'USER_UPDATED' || local?.email !== authUser.email) {
              void refreshPerfilInBackground(authUser.id);
            }
          }).catch(() => logger.debug('auth.email_refresh_skipped'));
        }, 0);
        return;
      }

      // Token sin usuario: no rehidratar el perfil.
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
  }, [refreshPerfilInBackground]);

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
