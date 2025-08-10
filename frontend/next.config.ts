import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Disable server-side optimization for devtools stability
    optimizePackageImports: ["@supabase/supabase-js"],
  },
  // Ensure proper hydration
  poweredByHeader: false,
  reactStrictMode: true,
  // Reduce bundle size and improve performance
  compress: true,
  // Environment variables configuration
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  },
};

export default nextConfig;
