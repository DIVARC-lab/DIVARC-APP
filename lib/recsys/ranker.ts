import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/* Ranker — logique de scoring + re-ranking partagée entre :
 *  - /api/feed/personalized (route handler client-facing)
 *  - lib/queries/feed.ts (helper server-side pour le SSR de /feed)
 *
 * Pattern V1 lite :
 *  1. Candidate set : 200 posts <7j
 *  2. Scoring features : freshness, network, creator affinity, semantic match
 *  3. Re-ranking : hidden_users exclus, max 2 posts/auteur top 10
 *  4. Output : array post_id + ranking_metadata (signals pour transparence) */

type DbClient = SupabaseClient<Database>;

export type RankingSignal = {
  type:
    | "creator_affinity"
    | "network"
    | "trending"
    | "freshness"
    | "circle_match";
  label: string;
  weight: number;
};

export type RankingMetadata = {
  score: number;
  mode: "algorithmic" | "chronological";
  primary_signals: RankingSignal[];
};

export type RankedPostItem = {
  post_id: string;
  author_id: string;
  created_at: string;
  ranking_metadata: RankingMetadata;
};

type RankOptions = {
  cursor?: string;
  limit?: number;
  /** Si true, bypass total — retourne juste posts du graph en
   *  ORDER BY created_at DESC. */
  chronologicalMode?: boolean;
};

/* Charge les contextes nécessaires (settings, friendships, profile) puis
 * retourne les posts rankés. Limite par défaut 15.
 *
 * Cette fonction est volontairement self-contained (lit ses propres
 * dépendances) pour pouvoir être appelée soit depuis un route handler
 * (server) soit depuis un Server Component (server). */
export async function rankFeedForUser(
  supabase: DbClient,
  userId: string,
  options: RankOptions = {},
): Promise<{ items: RankedPostItem[]; nextCursor: string | null }> {
  const limit = options.limit ?? 15;

  /* Settings — détermine si chronological mode forcé. */
  const { data: settings } = await supabase
    .from("user_algorithm_settings")
    .select("chronological_mode, hidden_users")
    .eq("user_id", userId)
    .maybeSingle();

  const isChrono =
    options.chronologicalMode ?? settings?.chronological_mode ?? false;
  const hiddenUsers = settings?.hidden_users ?? [];

  /* Friend ids (utilisé en mode chrono ET algorithmique). */
  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, recipient_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
  const friendIds = (friendships ?? []).map((f) =>
    f.requester_id === userId ? f.recipient_id : f.requester_id,
  );

  if (isChrono) {
    return chronologicalRanking(
      supabase,
      userId,
      friendIds,
      hiddenUsers,
      options.cursor,
      limit,
    );
  }
  return algorithmicRanking(
    supabase,
    userId,
    new Set(friendIds),
    hiddenUsers,
    options.cursor,
    limit,
  );
}

/* ----------------------------------------------------------------
 * Mode chronologique strict (DSA art. 38)
 * ---------------------------------------------------------------- */
async function chronologicalRanking(
  supabase: DbClient,
  userId: string,
  friendIds: string[],
  hiddenUsers: string[],
  cursor: string | undefined,
  limit: number,
): Promise<{ items: RankedPostItem[]; nextCursor: string | null }> {
  const authorIds = [userId, ...friendIds].filter(
    (id) => !hiddenUsers.includes(id),
  );

  let query = supabase
    .from("posts")
    .select("id, author_id, created_at")
    .in("author_id", authorIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: posts } = await query;
  if (!posts) return { items: [], nextCursor: null };

  const sliced = posts.slice(0, limit);
  const items: RankedPostItem[] = sliced.map((p) => ({
    post_id: p.id,
    author_id: p.author_id,
    created_at: p.created_at,
    ranking_metadata: {
      score: 0,
      mode: "chronological",
      primary_signals: [
        {
          type: "freshness",
          label: "Mode chronologique : ordre temporel inverse",
          weight: 1,
        },
      ],
    },
  }));

  const nextCursor =
    posts.length > limit ? sliced[sliced.length - 1]!.created_at : null;
  return { items, nextCursor };
}

/* ----------------------------------------------------------------
 * Mode algorithmique V1
 * ---------------------------------------------------------------- */
async function algorithmicRanking(
  supabase: DbClient,
  userId: string,
  friendIds: Set<string>,
  hiddenUsers: string[],
  cursor: string | undefined,
  limit: number,
): Promise<{ items: RankedPostItem[]; nextCursor: string | null }> {
  /* Lecture profil — user_affinity + interest_vector pour semantic match. */
  const { data: profile } = await supabase
    .from("user_interest_profiles")
    .select("user_affinity, interest_vector")
    .eq("user_id", userId)
    .maybeSingle();
  const userAffinity = (profile?.user_affinity ?? {}) as Record<string, number>;
  const hasInterestVector =
    profile?.interest_vector !== null && profile?.interest_vector !== undefined;

  /* Si interest_vector dispo, on récupère top 100 posts proches via RPC. */
  const semanticMap = new Map<string, number>();
  if (hasInterestVector) {
    const { data: similar } = await supabase.rpc(
      "find_similar_posts_to_user",
      { target_user_id: userId, result_limit: 100 },
    );
    if (similar) {
      for (const row of similar) {
        semanticMap.set(row.post_id, row.similarity_score);
      }
    }
  }

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 3600 * 1000,
  ).toISOString();

  let query = supabase
    .from("posts")
    .select("id, author_id, created_at")
    .gte("created_at", sevenDaysAgo)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: candidates } = await query;
  if (!candidates) return { items: [], nextCursor: null };

  const now = Date.now();
  type Scored = {
    post_id: string;
    author_id: string;
    created_at: string;
    score: number;
    signals: RankingSignal[];
  };

  const scored: Scored[] = candidates
    .filter((c) => !hiddenUsers.includes(c.author_id))
    .map((c) => {
      const signals: RankingSignal[] = [];
      let score = 0;

      /* Feature 1 : freshness — exp 24h half-life. */
      const ageHours = (now - new Date(c.created_at).getTime()) / 3600_000;
      const freshness = Math.pow(0.5, ageHours / 24);
      score += freshness * 1.0;

      /* Feature 2 : network proximity. */
      if (friendIds.has(c.author_id)) {
        score += 2.0;
        signals.push({
          type: "network",
          label: "Tu suis cet auteur",
          weight: 0.4,
        });
      }

      /* Feature 3 : creator affinity (depuis user_affinity). */
      const affinity = userAffinity[c.author_id] ?? 0;
      if (affinity > 0) {
        const normalized = Math.min(1, affinity / 50);
        score += normalized * 1.5;
        if (normalized > 0.3) {
          signals.push({
            type: "creator_affinity",
            label: "Tu interagis souvent avec cet auteur",
            weight: normalized,
          });
        }
      }

      /* Feature 4 : semantic match (cosine similarity profile ↔ post). */
      const semanticScore = semanticMap.get(c.id);
      if (semanticScore && semanticScore > 0.4) {
        score += semanticScore * 2.5;
        if (semanticScore > 0.6) {
          signals.push({
            type: "creator_affinity",
            label: "Sujet proche de tes intérêts récents",
            weight: semanticScore,
          });
        }
      }

      if (signals.length === 0) {
        signals.push({
          type: "freshness",
          label: "Récent dans ton réseau",
          weight: freshness,
        });
      }

      return {
        post_id: c.id,
        author_id: c.author_id,
        created_at: c.created_at,
        score,
        signals,
      };
    });

  /* Re-ranking : trier + cap 2/auteur dans top 10. */
  scored.sort((a, b) => b.score - a.score);

  const finalItems: Scored[] = [];
  const authorCount = new Map<string, number>();
  for (const item of scored) {
    const count = authorCount.get(item.author_id) ?? 0;
    if (finalItems.length < 10 && count >= 2) continue;
    finalItems.push(item);
    authorCount.set(item.author_id, count + 1);
    if (finalItems.length >= limit + 1) break;
  }

  const sliced = finalItems.slice(0, limit);
  const items: RankedPostItem[] = sliced.map((s) => ({
    post_id: s.post_id,
    author_id: s.author_id,
    created_at: s.created_at,
    ranking_metadata: {
      score: Math.round(s.score * 1000) / 1000,
      mode: "algorithmic",
      primary_signals: s.signals.slice(0, 3),
    },
  }));

  const nextCursor =
    finalItems.length > limit ? sliced[sliced.length - 1]!.created_at : null;
  return { items, nextCursor };
}
