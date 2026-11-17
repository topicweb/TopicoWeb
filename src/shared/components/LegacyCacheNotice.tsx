'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/core/providers/AuthProvider';
import { countLegacyPending } from '@/core/db/dexie/legacyCache';

export function LegacyCacheNotice() {
  const {user,businessId}=useAuth();
  const [notice,setNotice]=useState<{userId:string;count:number}|null>(null);
  useEffect(()=>{
    if(!user?.id||!businessId||!navigator.onLine) return;
    let current=true;
    void countLegacyPending(businessId).then(count=>{
      if(current) setNotice({userId:user.id,count});
    }).catch(()=>{ /* Source remains intact even when inspection is unavailable. */ });
    return()=>{current=false;};
  },[user?.id,businessId]);
  if(!notice?.count||notice.userId!==user?.id) return null;
  return <aside role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
    Hay {notice.count} cambios de una instalación anterior conservados en este equipo. Solicita su revisión antes de recuperarlos o enviarlos para evitar duplicar movimientos de stock.
  </aside>;
}
