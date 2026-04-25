import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  /* config options here */
  // Turbopack deshabilitado temporalmente para que el plugin PWA funcione correctamente
  // El plugin @ducanh2912/next-pwa usa Webpack y no es compatible con Turbopack
};

export default withPWA(nextConfig);
