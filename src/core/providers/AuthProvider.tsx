"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/core/db/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, openAccountCache, lockAccountCache, isAccountCacheOpen } from '@/core/db/dexie/db';
import { syncService } from '@/core/db/sync';
import { getDeviceId } from '@/core/utils/deviceId';
import { logger } from '@/core/utils/logger';
import { isPerfilValido, normalizePerfilFromSupabase } from '@/shared/utils/perfil';
import { migrateLegacySession } from '@/core/auth/legacySession';
import { clearLocalAuthCredentials, purgePrivateResponses } from '@/core/auth/privacy';
import { replaceSessionDocument } from '@/core/auth/navigation';
import type { Perfil, RolUsuario } from '@/features/usuarios/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  perfil: Perfil | null | undefined;
  role: RolUsuario | null;
  businessId: string | null;
  isLoading: boolean;
  isInitialPerfilLoad: boolean;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType>({ user:null, session:null, perfil:null, role:null, businessId:null, isLoading:true, isInitialPerfilLoad:false, signOut:async()=>{} });
export const useAuth = (): AuthContextType => useContext(AuthContext);
const SESSION_SIGNAL = 'topico:session-changed';
const signalSessionChange = () => {
  try { localStorage.setItem(SESSION_SIGNAL, crypto.randomUUID()); } catch { /* SDK broadcast still applies. */ }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<{ session: Session; perfil: Perfil } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const epoch = useRef(0);
  const currentId = useRef<string | null>(null);
  const selectedId = useRef<string | null>(null);
  const signingOut = useRef(false);

  const signOut = useCallback(async () => {
    if (signingOut.current) return;
    signingOut.current=true;
    setIsLoading(true);
    epoch.current++;
    currentId.current=null;
    syncService.setContext(null);
    setIdentity(null);
    lockAccountCache();
    signalSessionChange();
    try {
      if (navigator.onLine) {
        const { error } = await supabase.auth.signOut({ scope:'local' });
        if (error) logger.warn('auth.sign_out_failed');
      }
    } catch { logger.warn('auth.sign_out_failed'); }
    finally {
      try { clearLocalAuthCredentials(process.env.NEXT_PUBLIC_SUPABASE_URL, localStorage, document); }
      catch { logger.warn('auth.legacy_migration_failed'); }
      replaceSessionDocument('/login');
    }
  }, []);

  useEffect(() => {
    let mounted=true;
    let sequence=0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const schedule = (work:()=>Promise<void>) => {
      const timer=setTimeout(()=>{ timers.delete(timer); if(mounted) void work().catch(()=>logger.error('auth.profile_resolution_failed')); },0);
      timers.add(timer);
    };
    const isCurrent = (id:string, version:number, run:number) => mounted && currentId.current===id && epoch.current===version && sequence===run && !signingOut.current;
    const activate = async (session:Session, run:number) => {
      const id=session.user.id, version=epoch.current;
      try {
        if (navigator.onLine) {
          const result=await supabase.auth.getUser();
          if(!isCurrent(id,version,run)) return;
          if(result.error) {
            if(result.error.status===401 || result.error.status===403) { await signOut(); return; }
            throw new Error('Session verification unavailable');
          }
          if(result.data.user?.id!==id) { await signOut(); return; }
        }
        await openAccountCache(id);
        if(!isCurrent(id,version,run)) return;
        let profile=await db.perfiles.get(id);
        if(navigator.onLine) {
          const {data,error}=await supabase.from('perfiles').select('*').eq('id',id).maybeSingle();
          if(!isCurrent(id,version,run)) return;
          if(error) throw new Error('Profile unavailable');
          if(!data || !isPerfilValido(data as Perfil)) { await signOut(); return; }
          profile=normalizePerfilFromSupabase(data);
          await db.perfiles.put(profile);
        }
        if(!isCurrent(id,version,run)) return;
        // An installed cache may need its first online preparation after upgrade.
        // Keep the credential and legacy queues; this is not an explicit logout.
        if(!profile) throw new Error('Account cache unavailable');
        if(!isPerfilValido(profile) || profile.id!==id) { await signOut(); return; }
        setIdentity({session,perfil:profile!});
        setIsLoading(false);
      } catch {
        if(!isCurrent(id,version,run)) return;
        logger.error('auth.cache_failed');
        setIdentity(null);
        setIsLoading(false);
        syncService.setContext(null);
        lockAccountCache();
      }
    };
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if(!mounted || signingOut.current) return;
      const id=session?.user.id??null;
      const changed=id!==currentId.current;
      if(changed) {
        epoch.current++;
        syncService.setContext(null);
        setIdentity(null);
        if(selectedId.current && selectedId.current!==id) {
          lockAccountCache();
          currentId.current=null;
          setIsLoading(true);
          signalSessionChange();
          replaceSessionDocument(session?'/dashboard':'/login');
          return;
        }
        currentId.current=id;
        if(id) selectedId.current=id;
      }
      sequence++;
      if(!session) { setIdentity(null); setIsLoading(false); lockAccountCache(); return; }
      const run=sequence;
      // SDK callback must return synchronously; network/Dexie work is deferred.
      schedule(()=>activate(session,run));
      if(event==='SIGNED_IN' && changed) signalSessionChange();
    });
    schedule(async()=>{
      try { await migrateLegacySession(supabase,process.env.NEXT_PUBLIC_SUPABASE_URL,localStorage); }
      catch { logger.warn('auth.legacy_migration_failed'); }
      try { if('caches' in window) await purgePrivateResponses(caches,window.location.origin); }
      catch { logger.warn('auth.cache_failed'); }
    });
    const leave = () => {
      if(!mounted) return;
      epoch.current++;
      syncService.setContext(null);
      setIdentity(null);
      lockAccountCache();
      replaceSessionDocument('/login');
    };
    const storageChanged=(event:StorageEvent)=>{ if(event.key===SESSION_SIGNAL) leave(); };
    const pageShown=(event:PageTransitionEvent)=>{ if(event.persisted) leave(); };
    window.addEventListener('storage',storageChanged);
    window.addEventListener('pageshow',pageShown);
    return()=>{
      mounted=false; sequence++;
      subscription.unsubscribe();
      timers.forEach(clearTimeout);
      window.removeEventListener('storage',storageChanged);
      window.removeEventListener('pageshow',pageShown);
      syncService.setContext(null);
    };
  },[signOut]);

  const user=identity?.session.user??null;
  const livePerfil=useLiveQuery(async()=>user?.id && isAccountCacheOpen(user.id)?await db.perfiles.get(user.id):undefined,[user?.id]);
  const perfil=user && livePerfil?.id===user.id?livePerfil:identity?.perfil??null;
  const eligible=!!user && perfil?.id===user.id && isPerfilValido(perfil);
  const businessId=eligible?perfil?.business_id??null:null;
  useEffect(()=>{
    syncService.setContext(eligible && user?.id && businessId?{userId:user.id,businessId,deviceId:getDeviceId()}:null);
    return()=>syncService.setContext(null);
  },[eligible,user?.id,businessId]);
  useEffect(()=>{
    if(identity && livePerfil && !isPerfilValido(livePerfil)) void signOut();
  },[identity,livePerfil,signOut]);
  return <AuthContext.Provider value={{user,session:identity?.session??null,perfil,role:eligible?perfil?.rol??null:null,businessId,isLoading,isInitialPerfilLoad:isLoading,signOut}}>{children}</AuthContext.Provider>;
}
