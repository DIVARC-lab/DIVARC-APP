import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildUserProfile,
  hydrateCandidates,
  rankCandidates,
  type RawCandidate,
} from "@/lib/recsys/foryouRanker";

/* GET /api/reels/[id]/why — Chantier Reels Recsys étape 15.
 *
 * Calcule à la volée les `primary_signals` qui expliquent pourquoi
 * un reel particulier est surfacé pour cet user. Utilisé par le
 * composant <WhyThisReel /> au tap-long sur un reel.
 *
 * Approche : on construit un seul RawCandidate (source='similar_content'
 * par défaut, on calcule la cosine sim) puis on passe dans le ranker
 * pour récupérer les signals humanisés.
 */
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const { id: reelId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* 1. Récupère le reel + son embedding (pour cosine sim). */
  const [{ data: reel }, { data: reelEmbedding }] = await Promise.all([
    supabase
      .from("reels")
      .select("id, author_id, created_at, likes_count, comments_count, duration_seconds, description, hashtags")
      .eq("id", reelId)
      .maybeSingle(),
    supabase
      .from("reel_embeddings")
      .select("embedding")
      .eq("reel_id", reelId)
      .maybeSingle(),
  ]);

  if (!reel) {
    return NextResponse.json({ error: "Reel not found" }, { status: 404 });
  }

  /* 2. Construit un RawCandidate. Source par défaut : trending (neutre).
   *    Si on a un embedding + user interest_vector, on calcule la cosine
   *    en SQL et on bascule la source en similar_content. */
  const profile = await buildUserProfile(supabase, user.id);

  let candidate: RawCandidate = {
    content_id: reelId,
    content_type: "reel",
    source: "trending",
    source_score:
      (reel.likes_count ?? 0) + (reel.comments_count ?? 0) || 0.1,
    source_metadata: {
      likes_count: reel.likes_count,
      comments_count: reel.comments_count,
      velocity_per_hour:
        ((reel.likes_count ?? 0) + (reel.comments_count ?? 0)) /
        Math.max(
          (Date.now() - new Date(reel.created_at).getTime()) / (3600 * 1000),
          1,
        ),
    },
  };

  /* 3. Si on a embedding + interest_vector, calcul cosine via SQL pgvector. */
  if (reelEmbedding && profile.interest_vector) {
    const { data: simRow } = await supabase.rpc("find_similar_reels_to_user", {
      target_user_id: user.id,
      result_limit: 100,
    });
    type SimRow = { reel_id: string; similarity_score: number };
    const sim = ((simRow as SimRow[] | null) ?? []).find(
      (r) => r.reel_id === reelId,
    );
    if (sim) {
      candidate = {
        content_id: reelId,
        content_type: "reel",
        source: "similar_content",
        source_score: sim.similarity_score,
        source_metadata: { cosine_sim: sim.similarity_score },
      };
    }
  }

  /* 4. Vérifie network. */
  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},recipient_id.eq.${reel.author_id}),and(recipient_id.eq.${user.id},requester_id.eq.${reel.author_id})`,
    )
    .maybeSingle();

  if (friendship) {
    candidate = {
      content_id: reelId,
      content_type: "reel",
      source: "network",
      source_score: 0.8,
      source_metadata: {
        author_id: reel.author_id,
        reason: "author_in_network",
      },
    };
  }

  /* 5. Pass dans le ranker pour récupérer les primary_signals humanisés. */
  const contentById = await hydrateCandidates(supabase, [candidate]);
  const now = new Date();
  const [scored] = rankCandidates([candidate], contentById, profile, {
    surface: "reels_foryou",
    current_hour: now.getHours(),
    is_weekend: now.getDay() === 0 || now.getDay() === 6,
    recently_seen_ids: new Set(),
  });

  return NextResponse.json({
    reel_id: reelId,
    primary_signals: scored?.primary_signals ?? [],
    breakdown: scored?.breakdown ?? null,
    source: candidate.source,
  });
}
