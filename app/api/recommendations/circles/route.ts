import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* Recommandations cercles à rejoindre.
 *
 * Sources V1 :
 *  1. Cercles publics où ≥1 ami est déjà membre
 *  2. Cercles tendance (croissance membres récente)
 *
 * Filtres : exclut cercles déjà rejoints. */

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

  /* Mes cercles actuels (à exclure). */
  const { data: myMemberships } = await supabase
    .from("circle_members")
    .select("circle_id")
    .eq("user_id", user.id);
  const myCircleIds = new Set((myMemberships ?? []).map((m) => m.circle_id));

  /* Mes amis. */
  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, recipient_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);
  const friendIds = (friendships ?? []).map((f) =>
    f.requester_id === user.id ? f.recipient_id : f.requester_id,
  );

  /* Cercles où mes amis sont membres. */
  const friendCircleCounts: Record<string, number> = {};
  if (friendIds.length > 0) {
    const { data: friendsInCircles } = await supabase
      .from("circle_members")
      .select("circle_id")
      .in("user_id", friendIds);
    for (const m of friendsInCircles ?? []) {
      if (myCircleIds.has(m.circle_id)) continue;
      friendCircleCounts[m.circle_id] =
        (friendCircleCounts[m.circle_id] ?? 0) + 1;
    }
  }

  /* Top cercles par count d'amis présents. */
  const topIds = Object.entries(friendCircleCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id]) => id);

  if (topIds.length === 0) {
    return NextResponse.json({ items: [] });
  }

  /* Hydrate avec les cercles publics. */
  const { data: circles } = await supabase
    .from("circles")
    .select("id, slug, name, emoji, description, members_count, is_private")
    .in("id", topIds)
    .eq("is_private", false);

  const items = (circles ?? []).map((c) => ({
    circle: c,
    friend_count: friendCircleCounts[c.id] ?? 0,
    reason: `${friendCircleCounts[c.id] ?? 0} ami${(friendCircleCounts[c.id] ?? 0) > 1 ? "s" : ""} dans ce cercle`,
  }));

  return NextResponse.json({ items });
}
