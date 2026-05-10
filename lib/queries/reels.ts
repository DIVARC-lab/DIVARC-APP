import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  Reel,
  ReelWithDetails,
  Sound,
} from "@/lib/database.types";
import {
  computeAffinityFromViews,
  diversifyByAuthor,
  isColdStart,
  rankByPopularity,
  rankReels,
} from "@/lib/reels/forYouRanking";

const MIGRATION_MISSING_CODE = "42P01";

type AuthorPick = Pick<Profile, "id" | "full_name" | "username" | "avatar_url">;
type SoundPick = Pick<Sound, "id" | "title" | "artist" | "audio_url">;

/* Hydrate les détails (auteur, son, is_liked, is_saved) sur une liste
 * de reels. Tolérant aux migrations manquantes. */
async function attachReelDetails(
  reels: Reel[],
  currentUserId: string | null,
): Promise<ReelWithDetails[]> {
  if (reels.length === 0) return [];
  const supabase = await createClient();

  const authorIds = Array.from(new Set(reels.map((r) => r.author_id)));
  const soundIds = Array.from(
    new Set(reels.map((r) => r.sound_id).filter((s): s is string => !!s)),
  );
  const reelIds = reels.map((r) => r.id);

  const [authorsRes, soundsRes, likesRes, savesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", authorIds),
    soundIds.length > 0
      ? supabase
          .from("sounds")
          .select("id, title, artist, audio_url")
          .in("id", soundIds)
      : Promise.resolve({ data: [] }),
    currentUserId
      ? supabase
          .from("reel_likes")
          .select("reel_id")
          .eq("user_id", currentUserId)
          .in("reel_id", reelIds)
      : Promise.resolve({ data: [] }),
    currentUserId
      ? supabase
          .from("reel_saves")
          .select("reel_id")
          .eq("user_id", currentUserId)
          .in("reel_id", reelIds)
      : Promise.resolve({ data: [] }),
  ]);

  const authorById = new Map<string, AuthorPick>();
  for (const a of (authorsRes.data ?? []) as AuthorPick[]) {
    authorById.set(a.id, a);
  }

  const soundById = new Map<string, SoundPick>();
  for (const s of (soundsRes.data ?? []) as SoundPick[]) {
    soundById.set(s.id, s);
  }

  const likedSet = new Set(
    ((likesRes.data ?? []) as Array<{ reel_id: string }>).map((r) => r.reel_id),
  );
  const savedSet = new Set(
    ((savesRes.data ?? []) as Array<{ reel_id: string }>).map((r) => r.reel_id),
  );

  return reels.map((r) => ({
    ...r,
    author: authorById.get(r.author_id) ?? null,
    sound: r.sound_id ? (soundById.get(r.sound_id) ?? null) : null,
    is_liked: likedSet.has(r.id),
    is_saved: savedSet.has(r.id),
  }));
}

/* Liste les reels du feed "Pour toi" (For You).
 *
 * V2 ranking ML : calcule un AffinityProfile à partir des reel_views
 * de l'user (last 30j) → score chaque candidat sur 6 signaux :
 *   creator affinity, sound affinity, hashtag affinity, engagement
 *   velocity, recency, skip penalty. Cold start (< 5 views historiques) :
 *   fallback sur popularité globale (likes + saves + plays).
 *
 * Toutes les heuristiques V1 sont préservées : exclusion vues 24h,
 * diversification créateur (anti-bulle), pagination via beforeCreatedAt. */
export async function listForYouReels(
  currentUserId: string | null,
  limit: number = 20,
  beforeCreatedAt?: string | null,
): Promise<ReelWithDetails[]> {
  const supabase = await createClient();

  /* 1. Reels vus dans les 24h dernières — exclus du candidate set. */
  let excludedIds: string[] = [];
  if (currentUserId) {
    const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: viewed } = await supabase
      .from("reel_views")
      .select("reel_id")
      .eq("user_id", currentUserId)
      .gte("viewed_at", since24h)
      .limit(500);
    excludedIds = Array.from(
      new Set(((viewed ?? []) as Array<{ reel_id: string }>).map((v) => v.reel_id)),
    );
  }

  /* 2. Candidate set : 4× limit pour avoir matière à scorer. */
  let query = supabase
    .from("reels")
    .select("*")
    .eq("status", "published")
    .eq("audience", "public")
    .eq("moderation_status", "approved")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit * 4);

  if (beforeCreatedAt) {
    query = query.lt("created_at", beforeCreatedAt);
  }
  if (excludedIds.length > 0) {
    query = query.not("id", "in", `(${excludedIds.join(",")})`);
  }

  const { data, error } = await query;
  if (error) {
    if (error.code !== MIGRATION_MISSING_CODE) {
      console.error("[reels:listForYou]", error);
    }
    return [];
  }
  if (!data) return [];
  const candidates = data as Reel[];

  /* 3. Compute affinity profile (last 30j signals).
   *    - Cold start si pas d'user OU < 5 views : fallback popularité. */
  let ranked: Reel[];
  if (currentUserId) {
    const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: views } = await supabase
      .from("reel_views")
      .select(
        "reel_id, watch_ms, completed_pct, skipped, did_like, did_save, did_share, did_comment",
      )
      .eq("user_id", currentUserId)
      .gte("viewed_at", since30d)
      .limit(500);

    /* Hydrate les metas des reels vus pour calculer les affinités. */
    const viewedReelIds = Array.from(
      new Set(((views ?? []) as Array<{ reel_id: string }>).map((v) => v.reel_id)),
    );
    let viewedMetas: Array<{
      id: string;
      author_id: string;
      sound_id: string | null;
      hashtags: string[];
    }> = [];
    if (viewedReelIds.length > 0) {
      const { data: metas } = await supabase
        .from("reels")
        .select("id, author_id, sound_id, hashtags")
        .in("id", viewedReelIds);
      viewedMetas = (metas ?? []) as typeof viewedMetas;
    }

    const profile = computeAffinityFromViews(
      (views ?? []) as Parameters<typeof computeAffinityFromViews>[0],
      viewedMetas,
    );

    ranked = isColdStart(profile)
      ? rankByPopularity(candidates)
      : rankReels(candidates, profile);
  } else {
    ranked = rankByPopularity(candidates);
  }

  /* 4. Diversification anti-bulle : max 1 reel consec par auteur. */
  const diversified = diversifyByAuthor(ranked);
  return attachReelDetails(diversified.slice(0, limit), currentUserId);
}

/* Liste les reels des comptes suivis. */
export async function listFollowingReels(
  currentUserId: string,
  limit: number = 20,
): Promise<ReelWithDetails[]> {
  const supabase = await createClient();

  /* Récupère les amis acceptés. */
  const { data: friends } = await supabase
    .from("friendships")
    .select("requester_id, recipient_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`);

  const friendIds = new Set<string>();
  for (const f of (friends ?? []) as Array<{
    requester_id: string;
    recipient_id: string;
  }>) {
    friendIds.add(
      f.requester_id === currentUserId ? f.recipient_id : f.requester_id,
    );
  }
  if (friendIds.size === 0) return [];

  const { data, error } = await supabase
    .from("reels")
    .select("*")
    .eq("status", "published")
    .in("audience", ["public", "friends"])
    .eq("moderation_status", "approved")
    .is("deleted_at", null)
    .in("author_id", Array.from(friendIds))
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code !== MIGRATION_MISSING_CODE) {
      console.error("[reels:listFollowing]", error);
    }
    return [];
  }
  return attachReelDetails((data ?? []) as Reel[], currentUserId);
}

/* Récupère un reel précis par id (pour deep-link /reels/[id]). */
export async function getReel(
  reelId: string,
  currentUserId: string | null,
): Promise<ReelWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reels")
    .select("*")
    .eq("id", reelId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const [enriched] = await attachReelDetails([data as Reel], currentUserId);
  return enriched ?? null;
}

/* Reels d'un user pour son profil. */
export async function listReelsByUser(
  userId: string,
  currentUserId: string | null,
  limit: number = 30,
): Promise<ReelWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reels")
    .select("*")
    .eq("author_id", userId)
    .eq("status", "published")
    .eq("moderation_status", "approved")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return attachReelDetails(data as Reel[], currentUserId);
}

/* Reels qui utilisent un son donné (page /sounds/[id]). */
export async function listReelsBySound(
  soundId: string,
  currentUserId: string | null,
  limit: number = 30,
): Promise<ReelWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reels")
    .select("*")
    .eq("sound_id", soundId)
    .eq("status", "published")
    .eq("audience", "public")
    .eq("moderation_status", "approved")
    .is("deleted_at", null)
    .order("plays_count", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return attachReelDetails(data as Reel[], currentUserId);
}

/* `diversifyByAuthor` déplacé dans lib/reels/forYouRanking.ts (import en
 * tête) — partagé avec le scoring engine. */
