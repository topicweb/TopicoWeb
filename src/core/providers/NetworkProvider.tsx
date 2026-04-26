"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { logger } from "@/core/utils/logger";

interface NetworkContextType {
  isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextType>({ isOnline: true });

export const useNetwork = () => useContext(NetworkContext);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    logger.debug('[NetworkProvider] Estado inicial:', navigator.onLine ? '🟢 Online' : '🔴 Offline');

    const handleOnline = () => {
      logger.debug('[NetworkProvider] 🟢 Evento online detectado');
      setIsOnline(true);
    };

    const handleOffline = () => {
      logger.debug('[NetworkProvider] 🔴 Evento offline detectado');
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
    <NetworkContext.Provider value={{ isOnline }}>
      {children}
    </NetworkContext.Provider>
  );
}
