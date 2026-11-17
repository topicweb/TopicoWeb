"use client";

import { useEffect } from "react";
import { logger } from "@/core/utils/logger";

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
          .then(() => {
            logger.info('service_worker.registered', { area: 'service_worker', operation: 'register' });
          })
          .catch(() => {
            logger.error('service_worker.registration_failed', { area: 'service_worker', operation: 'register' });
          });
      }
    }
  }, []);
}
