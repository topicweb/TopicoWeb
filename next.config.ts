import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  /* config options here */
  // Esto silencia el error indicando que somos conscientes del uso de Turbopack
  // aunque existan configuraciones de Webpack (del plugin PWA).
  turbopack: {
  },
};

export default withPWA(nextConfig);
