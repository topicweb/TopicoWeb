import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import { runtimeCaching } from "./src/core/pwa/runtimeCaching";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheStartUrl: false,
  dynamicStartUrl: false,
  extendDefaultRuntimeCaching: false,
  workboxOptions: {
    runtimeCaching: [...runtimeCaching],
    cleanupOutdatedCaches: true,
    // HTML/RSC responses are never part of a precache. /offline is explicitly
    // added by next-pwa as the fixed, data-free navigation fallback.
    exclude: [/\.html?$/i, /\.rsc$/i],
  },
  fallbacks: { document: "/offline" },
});

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {}, // Configuración vacía para silenciar error de Turbopack con Webpack
};

export default withPWA(nextConfig);
