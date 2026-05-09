import type { MetadataRoute } from "next";

const BASE = "https://divarc.app";

/* robots.txt DIVARC — autorise l'indexation publique, bloque les routes
 * privées (settings, /messages, /wallet, /api). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/messages",
          "/messages/*",
          "/notifications",
          "/wallet",
          "/wallet/*",
          "/settings",
          "/profile",
          "/profile/*",
          "/welcome",
          "/login",
          "/signup",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
