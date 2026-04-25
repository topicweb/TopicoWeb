"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useBidirectionalSync } from "../hooks/useBidirectionalSync";

interface NetworkContextType {
  isOnline: boolean;
  isSyncing: boolean;
}

const NetworkContext = createContext<NetworkContextType>({ isOnline: true, isSyncing: false });

export const useNetwork = () => useContext(NetworkContext);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  // Sincronización bidireccional automática cuando hay conexión
  const { isSyncing } = useBidirectionalSync();

  useEffect(() => {
    setIsOnline(navigator.onLine);
    console.log('[NetworkProvider] Estado inicial:', navigator.onLine ? '🟢 Online' : '🔴 Offline');

    const handleOnline = () => {
      console.log('[NetworkProvider] 🟢 Evento online detectado');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[NetworkProvider] 🔴 Evento offline detectado');
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline, isSyncing }}>
      {children}
    </NetworkContext.Provider>
  );
}
