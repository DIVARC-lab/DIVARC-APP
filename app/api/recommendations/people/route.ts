import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* Recommandations PYMK (People You May Know).
 *
 * Sources V1 :
 *  1. Amis d'amis (AOA) — friendships transitives
 *  2. Membres communs des cercles auxquels j'appartiens
 *  3. Personnes que j'ai visitées récemment via profile.visit
 *
 * Filtres : exclut moi-même, exclut amis actuels, exclut hidden_users.
 * Score combiné = sum des sources avec poids différents. */

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
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

  /* Settings : pour respecter contacts_consent. */
  const { data: settings } = await supabase
    .from("user_algorithm_settings")
    .select("contacts_consent, hidden_users")
    .eq("user_id", user.id)
    .maybeSingle();
  const hiddenUsers = settings?.hidden_users ?? [];

  /* 1. Mes amis actuels (à exclure). */
  const { data: myFriendships } = await supabase
    .from("friendships")
    .select("requester_id, recipient_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);
  const myFriendIds = new Set<string>();
  for (const f of myFriendships ?? []) {
    myFriendIds.add(f.requester_id === user.id ? f.recipient_id : f.requester_id);
  }

  /* 2. Amis d'amis (AOA). Pour chaque ami direct, on liste SES amis,
        et on compte combien de "ponts" mènent à chaque candidat. */
  const aoaCounts: Record<string, number> = {};
  if (myFriendIds.size > 0) {
    const { data: aoa } = await supabase
      .from("friendships")
      .select("requester_id, recipient_id")
      .eq("status", "accepted")
      .or(
        `requester_id.in.(${[...myFriendIds].join(",")}),recipient_id.in.(${[...myFriendIds].join(",")})`,
      );
    for (const f of aoa ?? []) {
      const other =
        myFriendIds.has(f.requester_id) ? f.recipient_id : f.requester_id;
      if (other === user.id || myFriendIds.has(other)) continue;
      if (hiddenUsers.includes(other)) continue;
      aoaCounts[other] = (aoaCounts[other] ?? 0) + 1;
    }
  }

  /* 3. Personnes visitées récemment (signal d'intérêt manifeste). */
  const recentVisits: Record<string, number> = {};
  if (settings?.contacts_consent !== false) {
    const { data: visits } = await supabase
      .from("recsys_events")
      .select("target_user_id")
      .eq("user_id", user.id)
      .eq("event_type", "profile.visit")
      .not("target_user_id", "is", null)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
      .limit(200);
    for (const v of visits ?? []) {
      const id = v.target_user_id as string | null;
      if (!id || id === user.id || myFriendIds.has(id)) continue;
      if (hiddenUsers.includes(id)) continue;
      recentVisits[id] = (recentVisits[id] ?? 0) + 1;
    }
  }

  /* Score combiné : 5 × AOA bridges + 2 × visits. */
  const scoreById: Record<string, number> = {};
  for (const [id, count] of Object.entries(aoaCounts)) {
    scoreById[id] = (scoreById[id] ?? 0) + count * 5;
  }
  for (const [id, count] of Object.entries(recentVisits)) {
    scoreById[id] = (scoreById[id] ?? 0) + count * 2;
  }

  /* Top N par score. */
  const topIds = Object.entries(scoreById)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id]) => id);

  if (topIds.length === 0) {
    return NextResponse.json({ items: [] });
  }

  /* Hydrate avec les profils. */
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, headline, location")
    .in("id", topIds);

  const items = (profiles ?? [])
    .map((p) => ({
      profile: p,
      score: scoreById[p.id] ?? 0,
      reason:
        aoaCounts[p.id] && aoaCounts[p.id] > 1
          ? `${aoaCounts[p.id]} amis en commun`
          : aoaCounts[p.id]
            ? "1 ami en commun"
            : "Tu as visité son profil récemment",
    }))
    .sort((a, b) => b.score - a.score);

  return NextResponse.json({ items });
}
