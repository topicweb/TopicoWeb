"use client";

import { NetworkProvider } from "@/core/providers/NetworkProvider";
import { AuthProvider } from "@/core/providers/AuthProvider";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NetworkProvider>
      <AuthProvider>
        {children}
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </NetworkProvider>
  );
}
