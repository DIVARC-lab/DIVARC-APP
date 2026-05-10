"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* Server actions pour les commentaires de reels (P3.3 V1.5).
 *
 * Tables : reel_comments (migration 0054).
 * RLS : lecture publique, insert par user authentifié, update self only. */

const addCommentSchema = z.object({
  reel_id: z.string().uuid(),
  body: z.string().min(1).max(1000),
  parent_id: z.string().uuid().optional().nullable(),
});

export type AddReelCommentResult =
  | { ok: true; comment_id: string }
  | { ok: false; error: string };

export async function addReelComment(
  input: z.infer<typeof addCommentSchema>,
): Promise<AddReelCommentResult> {
  const parsed = addCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Commentaire invalide.",
    };
  }
  const { reel_id, body, parent_id } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  /* Vérifie que le reel autorise les commentaires. */
  const { data: reel } = await supabase
    .from("reels")
    .select("allow_comments, deleted_at")
    .eq("id", reel_id)
    .maybeSingle();
  if (!reel || reel.deleted_at) {
    return { ok: false, error: "Reel introuvable." };
  }
  if (!reel.allow_comments) {
    return { ok: false, error: "Les commentaires sont désactivés." };
  }

  const { data: comment, error } = await supabase
    .from("reel_comments")
    .insert({
      reel_id,
      author_id: user.id,
      body: body.trim(),
      parent_id: parent_id ?? null,
    })
    .select("id")
    .single();

  if (error || !comment) {
    console.error("[reels:addComment]", error);
    return { ok: false, error: "Publication échouée." };
  }

  return { ok: true, comment_id: comment.id };
}

export async function deleteReelComment(commentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* Vérifie ownership. */
  const { data: comment } = await supabase
    .from("reel_comments")
    .select("author_id")
    .eq("id", commentId)
    .maybeSingle();
  if (!comment || comment.author_id !== user.id) {
    return { ok: false as const, error: "Forbidden." };
  }

  const { error } = await supabase
    .from("reel_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId);

  if (error) {
    return { ok: false as const, error: "Suppression échouée." };
  }
  return { ok: true as const };
}
