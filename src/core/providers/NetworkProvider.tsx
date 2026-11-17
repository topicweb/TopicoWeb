"use client";

import React, { createContext, useContext, useSyncExternalStore } from "react";
import { logger } from "@/core/utils/logger";

interface NetworkContextType {
  isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextType>({ isOnline: true });

export const useNetwork = () => useContext(NetworkContext);

const subscribe = (notify: () => void) => {
    const handleOnline = () => {
      logger.debug('network.online', { area: 'sync', online: true });
      notify();
    };

    const handleOffline = () => {
      logger.debug('network.offline', { area: 'sync', online: false });
      notify();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
};

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

  return (
    <NetworkContext.Provider value={{ isOnline }}>
      {children}
    </NetworkContext.Provider>
  );
}
