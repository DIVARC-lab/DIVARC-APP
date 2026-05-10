import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* Endpoint feed personnalisé V1 lite.
 *
 * Étapes 8 + 13 du plan :
 *  - Mode chronologique (DSA art. 38, exempt en pratique mais
 *    implémenté pour conformité future)
 *  - Ranking heuristique pure SQL : combinaison linéaire de 4 features
 *    (engagement velocity, freshness, creator affinity, network proximity)
 *
 * Pas de ML, pas d'embeddings, pas de pgvector cosine en V1. Le profil
 * d'intérêts user (user_affinity) sert à booster les posts d'auteurs
 * que l'user a interagi avec récemment.
 *
 * Pagination : cursor = timestamp ISO du dernier post de la page courante.
 *
 * Retourne ranking_metadata.primary_signals pour alimenter le bouton
 * "Pourquoi je vois ce contenu ?" (transparence DSA + UX). */

const querySchema = z.object({
  surface: z
    .enum(["home", "circle", "topic"])
    .default("home"),
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(30).default(15),
  /* Force le mode (override des settings user pour debug ou A/B). */
  mode_override: z.enum(["algorithmic", "chronological"]).optional(),
});

type RankingSignal = {
  type:
    | "creator_affinity"
    | "network"
    | "trending"
    | "freshness"
    | "circle_match";
  label: string;
  weight: number;
};

type FeedItem = {
  post_id: string;
  ranking_metadata: {
    score: number;
    mode: "algorithmic" | "chronological";
    primary_signals: RankingSignal[];
  };
};

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
  const { cursor, limit, mode_override } = parsed.data;

  /* Lecture des settings — détermine si on bypass le ranking. */
  const { data: settings } = await supabase
    .from("user_algorithm_settings")
    .select("chronological_mode, hidden_users, hidden_topics")
    .eq("user_id", user.id)
    .maybeSingle();

  const mode: "algorithmic" | "chronological" =
    mode_override ?? (settings?.chronological_mode ? "chronological" : "algorithmic");
  const hiddenUsers = settings?.hidden_users ?? [];

  if (mode === "chronological") {
    return chronologicalFeed(supabase, user.id, cursor, limit, hiddenUsers);
  }
  return algorithmicFeed(supabase, user.id, cursor, limit, hiddenUsers);
}

/* ----------------------------------------------------------------
 * Mode chronologique strict (DSA art. 38).
 * Bypass complet du ranking. Posts du graph social en ordre temporel
 * inverse pur. Aucun re-ranking, aucune diversification, aucune
 * exploration. C'est le respect le plus strict de la transparence.
 * ---------------------------------------------------------------- */
async function chronologicalFeed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  cursor: string | undefined,
  limit: number,
  hiddenUsers: string[],
) {
  /* Récupère les amis pour borner le graph social. */
  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, recipient_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);

  const friendIds = (friendships ?? []).map((f) =>
    f.requester_id === userId ? f.recipient_id : f.requester_id,
  );
  const authorIds = [userId, ...friendIds].filter(
    (id) => !hiddenUsers.includes(id),
  );

  let query = supabase
    .from("posts")
    .select("id, created_at")
    .in("author_id", authorIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: posts } = await query;
  if (!posts) {
    return NextResponse.json({ items: [], next_cursor: null });
  }

  const sliced = posts.slice(0, limit);
  const items: FeedItem[] = sliced.map((p) => ({
    post_id: p.id,
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
  return NextResponse.json({ items, next_cursor: nextCursor });
}

/* ----------------------------------------------------------------
 * Mode algorithmique V1 — heuristique pure.
 *
 * Pipeline simplifié :
 *  1. Candidate generation : posts du graph social + posts récents avec
 *     forte engagement velocity hors-réseau (exploration)
 *  2. Score = network_boost + freshness + engagement_velocity
 *     + creator_affinity (depuis user_interest_profiles.user_affinity)
 *  3. Re-ranking trivial : exclusion hidden_users, déduplication par
 *     auteur (max 2 posts/auteur dans top 10)
 *
 * V2 : ajouter cosine similarity pgvector + ML ranker LightGBM.
 * ---------------------------------------------------------------- */
async function algorithmicFeed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  cursor: string | undefined,
  limit: number,
  hiddenUsers: string[],
) {
  /* Lecture profil pour booster les posts d'auteurs affinitaires. */
  const { data: profile } = await supabase
    .from("user_interest_profiles")
    .select("user_affinity, interest_vector")
    .eq("user_id", userId)
    .maybeSingle();
  const userAffinity = (profile?.user_affinity ?? {}) as Record<string, number>;
  const hasInterestVector = profile?.interest_vector !== null && profile?.interest_vector !== undefined;

  /* Si l'user a un interest_vector, on récupère les top posts sémantiquement
     proches via la RPC pgvector. Map post_id → similarity_score pour
     enrichir le scoring. */
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

  /* Friend ids pour le boost network. */
  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, recipient_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
  const friendIds = new Set(
    (friendships ?? []).map((f) =>
      f.requester_id === userId ? f.recipient_id : f.requester_id,
    ),
  );

  /* Candidate set : posts des 7 derniers jours, ordre par recency. On
     prend large (200 candidats) pour avoir de la marge au re-ranking. */
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 3600 * 1000,
  ).toISOString();
  /* V1 lite : on n'inclut pas les counts likes/comments car ces colonnes
     n'existent pas dans la table `posts` (les counts sont calculés à la
     volée dans listFeedPosts via tables séparées post_likes/comments).
     On garde le scoring simple sans engagement velocity en V1 — V2
     ajoutera une vue matérialisée post_engagement_stats. */
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
  if (!candidates) {
    return NextResponse.json({ items: [], next_cursor: null });
  }

  const now = Date.now();
  /* Scoring par candidat. */
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

      /* Feature 1 : freshness — décroissance exponentielle 24h half-life. */
      const ageHours = (now - new Date(c.created_at).getTime()) / 3600_000;
      const freshness = Math.pow(0.5, ageHours / 24);
      score += freshness * 1.0;

      /* Feature 2 : engagement velocity — skip V1 (cf. commentaire query
         pour la justification). V2 ajoutera une vue matérialisée. */

      /* Feature 3 : network proximity — boost x2 si auteur ami. */
      if (friendIds.has(c.author_id)) {
        score += 2.0;
        signals.push({
          type: "network",
          label: "Tu suis cet auteur",
          weight: 0.4,
        });
      }

      /* Feature 4 : creator affinity — boost selon user_affinity. */

      /* Feature 5 : semantic match — cosine similarity entre interest_vector
         user et embedding du post (via RPC find_similar_posts_to_user).
         Boost majeur (poids 2.5) si score > 0.6 = vrai match sémantique. */
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

      const affinity = userAffinity[c.author_id] ?? 0;
      if (affinity > 0) {
        const normalizedAffinity = Math.min(1, affinity / 50);
        score += normalizedAffinity * 1.5;
        if (normalizedAffinity > 0.3) {
          signals.push({
            type: "creator_affinity",
            label: "Tu interagis souvent avec cet auteur",
            weight: normalizedAffinity,
          });
        }
      }

      /* Si aucun signal fort, mettre fresnshess en signal par défaut. */
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

  /* Re-ranking : trier par score, puis dédupliquer par auteur dans top 10. */
  scored.sort((a, b) => b.score - a.score);

  const finalItems: Scored[] = [];
  const authorCount = new Map<string, number>();
  for (const item of scored) {
    const count = authorCount.get(item.author_id) ?? 0;
    /* Cap 2 posts par auteur dans le top 10. */
    if (finalItems.length < 10 && count >= 2) continue;
    finalItems.push(item);
    authorCount.set(item.author_id, count + 1);
    if (finalItems.length >= limit + 1) break;
  }

  const sliced = finalItems.slice(0, limit);
  const items: FeedItem[] = sliced.map((s) => ({
    post_id: s.post_id,
    ranking_metadata: {
      score: Math.round(s.score * 1000) / 1000,
      mode: "algorithmic",
      primary_signals: s.signals.slice(0, 3),
    },
  }));

  const nextCursor =
    finalItems.length > limit ? sliced[sliced.length - 1]!.created_at : null;
  return NextResponse.json({ items, next_cursor: nextCursor });
}
