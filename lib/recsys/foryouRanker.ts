import "server-only";

/* foryouRanker — Chantier Reels Recsys étape 10.
 *
 * Ranker heuristique TikTok-style pour le pipeline V3.
 *
 * Input  : candidats de generate_candidates_v3 (déjà mixés 7 sources)
 *          + profil user (interest_vector + affinities)
 *          + contenus hydratés (posts ou reels)
 * Output : ScoredCandidate[] triés par final_score décroissant + breakdown
 *          des features qui ont contribué (pour explainability).
 *
 * Pourquoi un nouveau module et pas refactor ranker.ts existant :
 *  - ranker.ts est utilisé par /lib/queries/feed.ts pour le tab "for-you"
 *    actuel ; on ne veut pas casser cette surface en V2.
 *  - foryouRanker est appelé par les nouveaux endpoints /api/feed/foryou
 *    et /api/reels/foryou (étape 12).
 *  - Plus tard, on peut consolider en migrant l'ancien pipeline vers
 *    foryouRanker, mais ça dépendra du A/B "feed-ranking-v2026".
 *
 * Phase 1 : heuristique pondérée (poids fixes). Phase 2 (futur) : LightGBM
 * entraîné sur les events observés.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type SupaClient = SupabaseClient<any, "public", any>;

export type ContentType = "post" | "reel";
export type CandidateSource =
  | "network"
  | "similar_content"
  | "creator_revisit"
  | "exploration"
  | "collaborative"
  | "trending"
  | "fresh_creators";

export type RawCandidate = {
  content_id: string;
  content_type: ContentType;
  source: CandidateSource;
  source_score: number;
  source_metadata: Record<string, unknown>;
};

export type HydratedContent = {
  id: string;
  content_type: ContentType;
  author_id: string;
  created_at: string;
  /* Engagement absolu. */
  total_reactions: number;
  comments_count: number;
  likes_count: number;
  /* Spécifique vidéo (null pour posts standard). */
  duration_seconds: number | null;
  /* Texte pour matching language/hashtags. */
  body_or_description: string | null;
  hashtags: string[];
};

export type UserProfile = {
  user_id: string;
  interest_vector: number[] | null;
  creator_affinity_by_id: Map<string, number>;
  recent_engaged_hashtags: Set<string>;
  is_lurker: boolean; /* >80% impressions, peu d'interactions */
};

export type RankingContext = {
  surface: "feed_foryou" | "reels_foryou" | "feed_home" | "reels";
  /* Hour 0-23 pour matcher avec préférences temporelles user. */
  current_hour: number;
  is_weekend: boolean;
  /* IDs vus récemment à exclure dur. */
  recently_seen_ids: Set<string>;
};

export type FeatureBreakdown = {
  source_score: number;
  source_bonus: number;
  freshness: number;
  engagement_velocity: number;
  creator_affinity: number;
  hashtag_affinity: number;
  network_bonus: number;
  format_match: number;
  /* Pénalités (négatives). */
  same_author_dampening: number;
  duration_mismatch: number;
};

export type ScoredCandidate = {
  candidate: RawCandidate;
  final_score: number;
  primary_signals: Array<{
    type: string;
    label: string;
    weight: number;
  }>;
  breakdown: FeatureBreakdown;
};

/* === Poids des sources (boost intrinsèque) ============================
 *
 * Le source_score est entre 0-30+ selon la source. On le normalise puis
 * on applique un boost selon le type de source — ça permet de combiner
 * un score similar_content (0..1 cosine) avec un score velocity
 * trending (peut être 30+).
 */
const SOURCE_NORMALIZE: Record<CandidateSource, number> = {
  network: 1.0, // déjà 0..1 (exp decay)
  similar_content: 1.0, // déjà 0..1 (cosine)
  creator_revisit: 0.15, // affinity_score peut être 0..50 → normalize
  exploration: 1.0, // statique 0.4
  collaborative: 0.1, // somme similarités, peut être grand
  trending: 0.05, // velocity_per_hour peut être 100+
  fresh_creators: 1.0, // statique 0.5
};

/* Boost intrinsèque selon la source — reflète la confiance qu'on a dans
 * chaque source comme prédicteur de pertinence. */
const SOURCE_BONUS: Record<CandidateSource, number> = {
  network: 1.4,
  similar_content: 1.3,
  creator_revisit: 1.5, // le secret TikTok — boost fort
  exploration: 0.9, // léger handicap mais on en a besoin
  collaborative: 1.2,
  trending: 1.1,
  fresh_creators: 1.0,
};

/* === Scoring principal ===============================================
 *
 * Combine source_score normalisé + features dérivées du contenu et du
 * profil user. Retourne ScoredCandidate[] triés desc.
 */
export function rankCandidates(
  candidates: RawCandidate[],
  contentById: Map<string, HydratedContent>,
  profile: UserProfile,
  context: RankingContext,
): ScoredCandidate[] {
  const scored: ScoredCandidate[] = [];

  for (const c of candidates) {
    const content = contentById.get(c.content_id);
    if (!content) continue;
    if (context.recently_seen_ids.has(c.content_id)) continue;

    const breakdown = computeBreakdown(c, content, profile, context);
    const final_score =
      breakdown.source_score * breakdown.source_bonus +
      breakdown.freshness * 1.0 +
      breakdown.engagement_velocity * 0.8 +
      breakdown.creator_affinity * 1.5 +
      breakdown.hashtag_affinity * 0.6 +
      breakdown.network_bonus * 0.8 +
      breakdown.format_match * 0.5 +
      breakdown.same_author_dampening +
      breakdown.duration_mismatch;

    scored.push({
      candidate: c,
      final_score,
      primary_signals: buildSignals(c, breakdown),
      breakdown,
    });
  }

  return scored.sort((a, b) => b.final_score - a.final_score);
}

/* === Feature breakdown ================================================ */
function computeBreakdown(
  candidate: RawCandidate,
  content: HydratedContent,
  profile: UserProfile,
  context: RankingContext,
): FeatureBreakdown {
  const source = candidate.source;

  /* 1. Source score normalisé + boost source. */
  const source_score =
    Math.min(candidate.source_score * SOURCE_NORMALIZE[source], 1.0);
  const source_bonus = SOURCE_BONUS[source];

  /* 2. Freshness — exp decay 12h half-life. */
  const ageMs = Date.now() - new Date(content.created_at).getTime();
  const ageHours = ageMs / (3600 * 1000);
  const freshness = Math.exp(-ageHours / 12);

  /* 3. Engagement velocity — (reactions + comments) / heures.
   *    Log compression pour ne pas écraser les autres signaux. */
  const totalEng = content.total_reactions + content.comments_count;
  const velocity = totalEng / Math.max(ageHours, 1);
  const engagement_velocity = Math.log1p(velocity) / 4; /* 0..2 typique */

  /* 4. Creator affinity — score cumulé sur 14j (depuis profile.user_affinity). */
  const creator_affinity =
    Math.min((profile.creator_affinity_by_id.get(content.author_id) ?? 0) / 20, 1.0);

  /* 5. Hashtag affinity — overlap entre hashtags du contenu et hashtags
   *    récemment engagés par l'user. */
  let hashtagMatches = 0;
  for (const tag of content.hashtags) {
    if (profile.recent_engaged_hashtags.has(tag.toLowerCase())) hashtagMatches += 1;
  }
  const hashtag_affinity = Math.min(hashtagMatches * 0.3, 1.0);

  /* 6. Network bonus — bump pour contenus du réseau (l'auteur est dans
   *    creator_affinity_by_id signifie qu'il y a eu interaction). */
  const network_bonus = source === "network" ? 0.5 : 0;

  /* 7. Format match — pour Reels, vidéos courtes (<30s) bump si user
   *    est lurker (consomme rapidement). Pour Feed, pas de match
   *    spécifique en V1. */
  let format_match = 0;
  if (content.content_type === "reel" && content.duration_seconds) {
    if (profile.is_lurker && content.duration_seconds <= 30) format_match = 0.3;
    if (!profile.is_lurker && content.duration_seconds > 30) format_match = 0.2;
  }

  /* 8. Pénalité : duration mismatch — reels trop longs (>120s) pénalisés
   *    si user a watch_time moyen faible. */
  let duration_mismatch = 0;
  if (
    content.content_type === "reel" &&
    content.duration_seconds &&
    content.duration_seconds > 120
  ) {
    duration_mismatch = -0.2;
  }

  /* 9. Pénalité same_author — sera appliquée dans le re-ranker (étape 11)
   *    car nécessite contexte des positions précédentes. Ici à 0. */
  const same_author_dampening = 0;

  return {
    source_score,
    source_bonus,
    freshness,
    engagement_velocity,
    creator_affinity,
    hashtag_affinity,
    network_bonus,
    format_match,
    same_author_dampening,
    duration_mismatch,
  };
}

function buildSignals(
  candidate: RawCandidate,
  breakdown: FeatureBreakdown,
): Array<{ type: string; label: string; weight: number }> {
  const signals: Array<{ type: string; label: string; weight: number }> = [];

  switch (candidate.source) {
    case "network":
      signals.push({
        type: "network",
        label: "Auteur dans ton réseau",
        weight: breakdown.source_score * breakdown.source_bonus,
      });
      break;
    case "similar_content": {
      const sim =
        (candidate.source_metadata?.cosine_sim as number | undefined) ?? 0;
      signals.push({
        type: "similar_content",
        label: `Similaire à ce que tu apprécies (${Math.round(sim * 100)}%)`,
        weight: breakdown.source_score * breakdown.source_bonus,
      });
      break;
    }
    case "creator_revisit": {
      const wc =
        (candidate.source_metadata?.watched_full_count as number | undefined) ??
        0;
      signals.push({
        type: "creator_revisit",
        label:
          wc > 0
            ? `Tu as déjà regardé ${wc} vidéo${wc > 1 ? "s" : ""} de cet auteur`
            : "Tu as déjà interagi avec cet auteur",
        weight: breakdown.source_score * breakdown.source_bonus,
      });
      break;
    }
    case "exploration":
      signals.push({
        type: "exploration",
        label: "Sortie de ta bulle : sujets que tu n'as pas encore explorés",
        weight: breakdown.source_score * breakdown.source_bonus,
      });
      break;
    case "collaborative": {
      const co =
        (candidate.source_metadata?.co_likers as number | undefined) ?? 0;
      signals.push({
        type: "collaborative",
        label: `${co} personnes aux goûts similaires aux tiens ont aimé`,
        weight: breakdown.source_score * breakdown.source_bonus,
      });
      break;
    }
    case "trending": {
      const v =
        (candidate.source_metadata?.velocity_per_hour as number | undefined) ??
        0;
      signals.push({
        type: "trending",
        label: `Conversation active : ~${Math.round(v)} engagements/h`,
        weight: breakdown.source_score * breakdown.source_bonus,
      });
      break;
    }
    case "fresh_creators":
      signals.push({
        type: "fresh_creators",
        label: "Nouveau créateur sur DIVARC",
        weight: breakdown.source_score * breakdown.source_bonus,
      });
      break;
  }

  if (breakdown.freshness > 0.7) {
    signals.push({
      type: "freshness",
      label: "Publié il y a peu",
      weight: breakdown.freshness,
    });
  }
  if (breakdown.creator_affinity > 0.3) {
    signals.push({
      type: "creator_affinity",
      label: "Auteur que tu apprécies",
      weight: breakdown.creator_affinity * 1.5,
    });
  }
  if (breakdown.hashtag_affinity > 0.3) {
    signals.push({
      type: "hashtag_affinity",
      label: "Hashtags qui te parlent",
      weight: breakdown.hashtag_affinity * 0.6,
    });
  }

  /* On garde les 3 plus contributifs. */
  return signals.sort((a, b) => b.weight - a.weight).slice(0, 3);
}

/* === Hydratation des contenus =========================================
 *
 * Récupère en batch les détails des posts/reels candidats pour calculer
 * les features. Split par content_type pour query optimisée.
 */
export async function hydrateCandidates(
  supabase: SupaClient,
  candidates: RawCandidate[],
): Promise<Map<string, HydratedContent>> {
  const postIds: string[] = [];
  const reelIds: string[] = [];
  for (const c of candidates) {
    if (c.content_type === "post") postIds.push(c.content_id);
    else reelIds.push(c.content_id);
  }

  const result = new Map<string, HydratedContent>();

  if (postIds.length > 0) {
    const { data: posts } = await supabase
      .from("posts")
      .select(
        "id, author_id, created_at, total_reactions, comments_count, likes_count, body, hashtags",
      )
      .in("id", postIds);
    for (const p of posts ?? []) {
      result.set(p.id, {
        id: p.id,
        content_type: "post",
        author_id: p.author_id,
        created_at: p.created_at,
        total_reactions: p.total_reactions ?? 0,
        comments_count: p.comments_count ?? 0,
        likes_count: p.likes_count ?? 0,
        duration_seconds: null,
        body_or_description: p.body,
        hashtags: (p.hashtags as string[] | null) ?? [],
      });
    }
  }

  if (reelIds.length > 0) {
    const { data: reels } = await supabase
      .from("reels")
      .select(
        "id, author_id, created_at, likes_count, comments_count, duration_seconds, description, hashtags",
      )
      .in("id", reelIds);
    for (const r of reels ?? []) {
      result.set(r.id, {
        id: r.id,
        content_type: "reel",
        author_id: r.author_id,
        created_at: r.created_at,
        total_reactions: r.likes_count ?? 0,
        comments_count: r.comments_count ?? 0,
        likes_count: r.likes_count ?? 0,
        duration_seconds: r.duration_seconds ?? null,
        body_or_description: r.description,
        hashtags: (r.hashtags as string[] | null) ?? [],
      });
    }
  }

  return result;
}

/* === Build user profile depuis user_interest_profiles + events =======
 *
 * Compose la structure UserProfile à partir de la BDD pour le ranker.
 */
export async function buildUserProfile(
  supabase: SupaClient,
  userId: string,
): Promise<UserProfile> {
  /* 1. Profil de base. */
  const { data: row } = await supabase
    .from("user_interest_profiles")
    .select("interest_vector, user_affinity, events_processed_count")
    .eq("user_id", userId)
    .maybeSingle();

  const interestVector = parseVector(row?.interest_vector);
  const userAffinity = (row?.user_affinity ?? {}) as Record<string, number>;
  const creatorMap = new Map<string, number>(Object.entries(userAffinity));

  /* 2. Hashtags récemment engagés (14j) — pour boost matching. */
  const { data: events } = await supabase
    .from("recsys_events")
    .select("target_post_id, event_type")
    .eq("user_id", userId)
    .in("event_type", [
      "post.like",
      "post.save",
      "post.share",
      "video.completion",
      "video.replay",
    ])
    .gte("created_at", new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString())
    .limit(500);

  const recentHashtags = new Set<string>();
  if (events && events.length > 0) {
    const ids = Array.from(
      new Set(events.map((e) => e.target_post_id).filter(Boolean)),
    ) as string[];
    if (ids.length > 0) {
      const [postsRes, reelsRes] = await Promise.all([
        supabase.from("posts").select("id, hashtags").in("id", ids),
        supabase.from("reels").select("id, hashtags").in("id", ids),
      ]);
      for (const row of (postsRes.data ?? []) as Array<{ hashtags: string[] | null }>) {
        for (const tag of row.hashtags ?? []) recentHashtags.add(tag.toLowerCase());
      }
      for (const row of (reelsRes.data ?? []) as Array<{ hashtags: string[] | null }>) {
        for (const tag of row.hashtags ?? []) recentHashtags.add(tag.toLowerCase());
      }
    }
  }

  /* 3. Détection lurker : ratio impressions / interactions sur 7j. */
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { count: impressionsCount } = await supabase
    .from("recsys_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("event_type", ["post.impression", "video.impression"])
    .gte("created_at", sevenDaysAgo);
  const { count: interactionsCount } = await supabase
    .from("recsys_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("event_type", [
      "post.like",
      "post.save",
      "post.share",
      "post.comment_create",
      "video.completion",
      "video.replay",
    ])
    .gte("created_at", sevenDaysAgo);
  const isLurker =
    (impressionsCount ?? 0) > 50 &&
    (interactionsCount ?? 0) / Math.max(impressionsCount ?? 1, 1) < 0.05;

  return {
    user_id: userId,
    interest_vector: interestVector,
    creator_affinity_by_id: creatorMap,
    recent_engaged_hashtags: recentHashtags,
    is_lurker: isLurker,
  };
}

function parseVector(raw: unknown): number[] | null {
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as number[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}

/* ====================================================================
 * RE-RANKER — Chantier Reels Recsys étape 11.
 *
 * Post-traitement business sur la liste triée du ranker. Applique :
 *  1. Diversification créateurs : max 1 du même dans les 5 derniers,
 *     max 2 dans les 10 derniers.
 *  2. Diversification sources : quota exploration ~1 sur 5,
 *     anti-monopole d'une source.
 *  3. Soft dedup hashtags : si 3 mêmes hashtags consécutifs, démotion.
 *  4. Boost contenus de close_friends (top 8 affinity) → toujours dans
 *     les premiers (force position ≤ 3 si dispo).
 *  5. Démotion contenus signalés/cliqués comme "see_less" historiquement.
 *
 * Algorithme : MMR (Maximal Marginal Relevance) — à chaque position du
 * feed final, on choisit le candidat qui maximise un score combiné
 * (relevance × diversity), pas juste le top score.
 *
 * Complexité : O(target_size × len(candidates)) — acceptable car
 * candidats déjà limités à ~500-800 et target_size 30-50.
 */

export type RerankContext = {
  target_size: number;
  /* IDs de close friends (top 8 affinity) — boost position. */
  close_friend_ids: Set<string>;
  /* IDs d'auteurs déjà "see_less" cliqués historiquement. */
  see_less_author_ids: Set<string>;
};

export function rerank(
  ranked: ScoredCandidate[],
  contentById: Map<string, HydratedContent>,
  context: RerankContext,
): ScoredCandidate[] {
  const remaining = [...ranked];
  const finalFeed: ScoredCandidate[] = [];

  const seenAuthors: string[] = []; /* ordre chronologique du feed final */
  const seenHashtags: string[] = [];
  const seenSources: CandidateSource[] = [];

  while (remaining.length > 0 && finalFeed.length < context.target_size) {
    let bestIdx = -1;
    let bestAdjusted = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const sc = remaining[i]!;
      const content = contentById.get(sc.candidate.content_id);
      if (!content) continue;

      let adjusted = sc.final_score;

      /* 1. Diversification auteurs. */
      const recent5 = seenAuthors.slice(-5);
      const recent10 = seenAuthors.slice(-10);
      const inRecent5 = recent5.filter((id) => id === content.author_id).length;
      const inRecent10 = recent10.filter((id) => id === content.author_id).length;

      if (inRecent5 >= 1) adjusted *= 0.25;
      if (inRecent10 >= 2) {
        /* Hard exclusion. */
        continue;
      }

      /* 2. Diversification sources : si 3 mêmes sources consécutives,
       *    on pénalise pour forcer la rotation. */
      const lastSources = seenSources.slice(-3);
      if (lastSources.length === 3 && lastSources.every((s) => s === sc.candidate.source)) {
        adjusted *= 0.5;
      }

      /* 3. Soft dedup hashtags : si tous les hashtags du contenu sont
       *    déjà dans les 3 derniers items, démotion. */
      if (content.hashtags.length > 0) {
        const recentTags = new Set(seenHashtags.slice(-15));
        const overlap = content.hashtags.filter((t) =>
          recentTags.has(t.toLowerCase()),
        ).length;
        if (overlap >= content.hashtags.length && overlap >= 2) {
          adjusted *= 0.7;
        }
      }

      /* 4. Boost close friends — force apparition tôt. */
      if (context.close_friend_ids.has(content.author_id)) {
        adjusted *= 1.6;
        /* Si on est dans les 3 premières positions, super boost. */
        if (finalFeed.length < 3) adjusted *= 1.3;
      }

      /* 5. Démotion forte sur see_less auteurs. */
      if (context.see_less_author_ids.has(content.author_id)) {
        adjusted *= 0.1;
      }

      /* 6. Quota exploration ~1 sur 5 :
       *    - si on est à la position 4,9,14,... et qu'on n'a PAS encore
       *      un exploration récent, on boost exploration.
       *    - sinon on dampe exploration. */
      const lastExplorationIdx = seenSources.lastIndexOf("exploration");
      const distSinceExploration =
        lastExplorationIdx === -1
          ? Infinity
          : seenSources.length - 1 - lastExplorationIdx;

      if (sc.candidate.source === "exploration") {
        if (distSinceExploration < 4) adjusted *= 0.5;
        else if (distSinceExploration >= 5) adjusted *= 1.4;
      }

      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;

    const chosen = remaining.splice(bestIdx, 1)[0]!;
    chosen.final_score = bestAdjusted; /* on update pour explainability */
    finalFeed.push(chosen);

    const c = contentById.get(chosen.candidate.content_id);
    if (c) {
      seenAuthors.push(c.author_id);
      for (const tag of c.hashtags) seenHashtags.push(tag.toLowerCase());
    }
    seenSources.push(chosen.candidate.source);
  }

  return finalFeed;
}
