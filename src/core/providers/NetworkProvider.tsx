"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { syncService } from "../services/syncService";

interface NetworkContextType {
  isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextType>({ isOnline: true });

export const useNetwork = () => useContext(NetworkContext);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Initial check
    const online = navigator.onLine;
    setIsOnline(online);
    
    if (online) {
      syncService.sync();
      syncService.listenToChanges();
    }

    const handleOnline = () => {
      setIsOnline(true);
      console.log("Came online, starting sync...");
      syncService.sync();
      syncService.listenToChanges(); // Re-subscribe on reconnection
    };
    const handleOffline = () => setIsOnline(false);

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
