/* lib/supabase/reels.ts — façade d'accès données Reels.
 *
 * Re-exports nommés des fonctions de `lib/queries/reels.ts` sous des
 * alias propres alignés sur la spec produit (getReelsPage,
 * toggleReelLike, getReelComments, addReelComment).
 *
 * Pourquoi cette indirection : le module `lib/queries/reels.ts`
 * contient toute la logique recsys V3 (foryouPipeline, ranking,
 * diversification créateur, exclusion vues 24h). On veut éviter qu'un
 * consommateur tiers se branche directement dessus — cette façade
 * expose UNIQUEMENT les fonctions de surface utilisables côté UI.
 *
 * Les actions (toggleReelLike, addReelComment) passent par les routes
 * API existantes (`/api/reels/[id]/like`, `/api/reels/[id]/comments`)
 * pour rester côté client. Aucune action ici n'est server-only. */

import { createClient } from "@/lib/supabase/client";
import type { ReelWithDetails } from "@/lib/database.types";

/* === Lecture (server actions wrappers) === */

/* Liste paginée de reels du foryou ranker. Wrap la server action
 * `loadMoreForYouReels` qui gère l'exclusion des IDs déjà vus + le
 * pipeline V3 + diversification. */
export async function getReelsPage(opts: {
  excludeIds?: string[];
  limit?: number;
}): Promise<{ ok: boolean; reels: ReelWithDetails[] }> {
  const { loadMoreForYouReels } = await import(
    "@/app/(app)/reels/foryou-actions"
  );
  return loadMoreForYouReels(opts.excludeIds ?? [], opts.limit ?? 12);
}

/* === Actions (passent par les API routes existantes pour pouvoir
       être appelées depuis n'importe quel composant client) === */

export async function toggleReelLike(reelId: string): Promise<{
  ok: boolean;
  liked: boolean;
  likes_count: number;
}> {
  try {
    const res = await fetch(`/api/reels/${reelId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      return { ok: false, liked: false, likes_count: 0 };
    }
    const json = (await res.json()) as {
      liked: boolean;
      likes_count: number;
    };
    return { ok: true, liked: json.liked, likes_count: json.likes_count };
  } catch {
    return { ok: false, liked: false, likes_count: 0 };
  }
}

export type ReelCommentRow = {
  id: string;
  reel_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export async function getReelComments(
  reelId: string,
): Promise<ReelCommentRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reel_comments")
    .select(
      "id, reel_id, user_id, content, parent_comment_id, created_at, author:profiles!reel_comments_user_id_fkey(id, full_name, username, avatar_url)",
    )
    .eq("reel_id", reelId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as unknown as ReelCommentRow[];
}

export async function addReelComment(args: {
  reelId: string;
  content: string;
  parentCommentId?: string | null;
}): Promise<{ ok: boolean; comment?: ReelCommentRow }> {
  try {
    const res = await fetch(`/api/reels/${args.reelId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: args.content,
        parent_comment_id: args.parentCommentId ?? null,
      }),
    });
    if (!res.ok) return { ok: false };
    const json = (await res.json()) as { comment: ReelCommentRow };
    return { ok: true, comment: json.comment };
  } catch {
    return { ok: false };
  }
}
