import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* JSDOM (Website Analyzer) doit être traité comme module externe sur
     Vercel serverless. Sans ça, Turbopack tente de bundler les deps
     natives de JSDOM (canvas, etc.) et le module crash au chargement
     → 500 nu rendu en HTML par Next.js sans même atteindre le handler. */
  serverExternalPackages: ["jsdom"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
