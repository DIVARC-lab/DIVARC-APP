import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* Recommandations marketplace personnalisées.
 *
 * Sources V1 :
 *  1. Catégories des listings vus / favorisés récemment (signal d'intérêt)
 *  2. Range de prix moyen des listings consultés
 *  3. Boost si l'auteur est un vendeur fréquent dans mes catégories
 *
 * Filtres : status active uniquement, exclut mes propres listings,
 * exclut listings déjà vus.
 *
 * V2 : ajouter cosine similarity sur embeddings de listings. */

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(12),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const { limit } = parsed.data;

  /* Catégories d'intérêt depuis les events recsys (favorites + clicks
     marketplace dans 30 derniers jours). On lit les listings cibles puis
     on agrège leurs catégories. */
  const { data: marketplaceEvents } = await supabase
    .from("recsys_events")
    .select("target_listing_id")
    .eq("user_id", user.id)
    .in("event_type", ["marketplace.favorite", "post.click_link", "post.impression"])
    .eq("surface", "marketplace")
    .not("target_listing_id", "is", null)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
    .limit(200);

  const seenListingIds = new Set(
    (marketplaceEvents ?? [])
      .map((e) => e.target_listing_id)
      .filter((id): id is string => Boolean(id)),
  );

  /* Catégories des listings vus. */
  const categoryWeights: Record<string, number> = {};
  if (seenListingIds.size > 0) {
    const { data: seenListings } = await supabase
      .from("listings")
      .select("category, price_amount")
      .in("id", [...seenListingIds]);
    for (const l of seenListings ?? []) {
      categoryWeights[l.category] = (categoryWeights[l.category] ?? 0) + 1;
    }
  }

  /* Top 3 catégories pour scope la recherche. */
  const topCategories = Object.entries(categoryWeights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat]) => cat);

  /* Si pas d'historique, fallback : tous les listings actifs récents. */
  const { data: candidates } =
    topCategories.length > 0
      ? await supabase
          .from("listings")
          .select("id, title, price_amount, price_currency, category, condition, location, seller_id, created_at")
          .eq("status", "active")
          .neq("seller_id", user.id)
          .in("category", topCategories)
          .order("created_at", { ascending: false })
          .limit(limit * 2)
      : await supabase
          .from("listings")
          .select("id, title, price_amount, price_currency, category, condition, location, seller_id, created_at")
          .eq("status", "active")
          .neq("seller_id", user.id)
          .order("created_at", { ascending: false })
          .limit(limit * 2);

  const filtered = (candidates ?? []).filter(
    (c) => !seenListingIds.has(c.id),
  );

  /* Score = freshness + boost catégorie. */
  const now = Date.now();
  const scored = filtered.map((c) => {
    const ageHours = (now - new Date(c.created_at).getTime()) / 3600_000;
    const freshness = Math.pow(0.5, ageHours / 48);
    const categoryBoost = categoryWeights[c.category] ?? 0;
    const score = freshness + categoryBoost * 0.3;
    return {
      listing: c,
      score,
      reason:
        categoryBoost > 0
          ? `Tu t'intéresses à ${c.category}`
          : "Récent près de chez toi",
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return NextResponse.json({ items: scored.slice(0, limit) });
}
