"use client";

import { useEffect } from "react";

// ───────────────────────────────────────────────────────────────────────────────
// SERVICE WORKER REGISTRATION
// Registra el service worker para funcionalidad PWA
// ───────────────────────────────────────────────────────────────────────────────

export function useRegisterSW() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Solo registrar en producción
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registrado:", registration);
          })
          .catch((error) => {
            console.error("Error al registrar Service Worker:", error);
          });
      }
    }
  }, []);
}
