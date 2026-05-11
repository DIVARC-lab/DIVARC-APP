"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* Étape 3.6 — actions relations sociales V0067 :
 *   - Follow asymétrique (toggle)
 *   - Close friends (toggle)
 *   - Mutual followers (lookup)
 *
 * Les friendships symétriques (0004) + pro_connections (0026) ont leurs
 * propres actions dans /friends et /pro respectivement, non touchées. */

export type RelationResult =
  | { ok: true; following?: boolean; close_friend?: boolean }
  | { ok: false; error: string };

const followSchema = z.object({ targetUserId: z.string().uuid() });

export async function toggleFollow(
  targetUserId: string,
): Promise<RelationResult> {
  const parsed = followSchema.safeParse({ targetUserId });
  if (!parsed.success) {
    return { ok: false, error: "ID utilisateur invalide." };
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("toggle_follow", {
      p_followed_id: parsed.data.targetUserId,
    });
    if (error) {
      console.error("[toggleFollow]", error);
      return { ok: false, error: "Action échouée." };
    }
    revalidatePath(`/u/${parsed.data.targetUserId}`);
    return { ok: true, following: data === true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

export async function toggleCloseFriend(
  closeFriendId: string,
): Promise<RelationResult> {
  const parsed = followSchema.safeParse({ targetUserId: closeFriendId });
  if (!parsed.success) {
    return { ok: false, error: "ID utilisateur invalide." };
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("toggle_close_friend", {
      p_close_friend_id: parsed.data.targetUserId,
    });
    if (error) {
      console.error("[toggleCloseFriend]", error);
      return { ok: false, error: "Action échouée." };
    }
    revalidatePath(`/u/${closeFriendId}`);
    return { ok: true, close_friend: data === true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

/* Helpers de lecture côté server (à appeler depuis page.tsx ou route handler) */

export async function getFollowState(
  followedId: string,
): Promise<{ isFollowing: boolean; isFollower: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { isFollowing: false, isFollower: false };

  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    supabase.rpc("is_following", {
      p_follower_id: user.id,
      p_followed_id: followedId,
    }),
    supabase.rpc("is_following", {
      p_follower_id: followedId,
      p_followed_id: user.id,
    }),
  ]);

  return {
    isFollowing: outgoing === true,
    isFollower: incoming === true,
  };
}

export async function getMutualFollowers(
  targetUserId: string,
  limit = 12,
): Promise<
  Array<{
    user_id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  if (user.id === targetUserId) return [];

  const { data, error } = await supabase.rpc("get_mutual_followers", {
    p_user_a: user.id,
    p_user_b: targetUserId,
    p_limit: limit,
  });

  if (error || !Array.isArray(data)) return [];
  return data;
}

export async function isCloseFriend(closeFriendId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("close_friends")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("close_friend_id", closeFriendId)
    .maybeSingle();
  return data !== null;
}
