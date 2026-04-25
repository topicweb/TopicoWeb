"use client";

import { NetworkProvider } from "@/core/providers/NetworkProvider";
import { AuthProvider } from "@/core/providers/AuthProvider";
import { Toaster } from "sonner";
import { useRegisterSW } from "@/core/hooks/useRegisterSW";

// ───────────────────────────────────────────────────────────────────────────────
// GLOBAL PROVIDERS
// Configura contextos de red, autenticación y notificaciones
// ───────────────────────────────────────────────────────────────────────────────

export function Providers({ children }: { children: React.ReactNode }) {
  useRegisterSW();

  return (
    <NetworkProvider>
      <AuthProvider>
        {children}
        <Toaster richColors position="top-center" toastOptions={{ style: { zIndex: 9999 } }} />
      </AuthProvider>
    </NetworkProvider>
  );
}
