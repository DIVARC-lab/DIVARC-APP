import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE = "https://divarc.app";

/* Sitemap dynamique DIVARC — combine pages statiques + entités publiques :
 * - Profils discoverable (limit 1000 pour rester sous le cap Google de 50k)
 * - Listings actifs marketplace (limit 1000)
 * - Jobs actifs (limit 500)
 * - Cercles publics (limit 200)
 *
 * Le sitemap est server-rendered, mis en cache par Next.js automatiquement
 * via le revalidate ci-dessous. */
export const revalidate = 3600; // 1h

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const now = new Date();

  /* Pages statiques principales — priorities calibrées sur l'importance
     UX et la fréquence de mise à jour. */
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE}/feed`,
      lastModified: now,
      changeFrequency: "always",
      priority: 0.9,
    },
    {
      url: `${BASE}/marketplace`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE}/jobs`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE}/circles`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE}/explore`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE}/signup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  /* Profils publics — uniquement les discoverable (opt-in). */
  const { data: profiles } = await supabase
    .from("profiles")
    .select("username, updated_at")
    .eq("discoverable", true)
    .not("username", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1000);

  const profileRoutes: MetadataRoute.Sitemap = (profiles ?? [])
    .filter((p): p is { username: string; updated_at: string } => Boolean(p.username))
    .map((p) => ({
      url: `${BASE}/u/${p.username}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  /* Listings actifs marketplace. */
  const { data: listings } = await supabase
    .from("listings")
    .select("id, updated_at")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1000);

  const listingRoutes: MetadataRoute.Sitemap = (listings ?? []).map((l) => ({
    url: `${BASE}/marketplace/${l.id}`,
    lastModified: new Date(l.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  /* Jobs publiés actifs. */
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, updated_at")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(500);

  const jobRoutes: MetadataRoute.Sitemap = (jobs ?? []).map((j) => ({
    url: `${BASE}/jobs/${j.id}`,
    lastModified: new Date(j.updated_at),
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  /* Cercles publics. */
  const { data: circles } = await supabase
    .from("circles")
    .select("slug")
    .eq("is_private", false)
    .not("slug", "is", null)
    .limit(200);

  const circleRoutes: MetadataRoute.Sitemap = (circles ?? [])
    .filter((c): c is { slug: string } => Boolean(c.slug))
    .map((c) => ({
      url: `${BASE}/circles/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.5,
    }));

  return [
    ...staticRoutes,
    ...profileRoutes,
    ...listingRoutes,
    ...jobRoutes,
    ...circleRoutes,
  ];
}
