"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const storyFilterSchema = z
  .enum(["original", "dore", "creme", "nuit", "pellicule", "argent"])
  .optional()
  .transform((v) => (v && v !== "original" ? v : null));

const captionPositionSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    scale: z.number().min(0.5).max(2),
  })
  .nullable()
  .optional();

const stickerSchema = z.object({
  emoji: z.string().min(1).max(8),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  scale: z.number().min(0.5).max(3),
  rotation: z.number().min(-180).max(180),
});
const stickersSchema = z.array(stickerSchema).max(16).optional().default([]);

const storySchema = z
  .object({
    type: z.enum(["photo", "text", "video"]),
    photo_url: z.string().url().nullable().optional(),
    video_url: z.string().url().nullable().optional(),
    video_thumbnail_url: z.string().url().nullable().optional(),
    video_duration_ms: z
      .number()
      .int()
      .min(0)
      .max(60_000) // 60s max — aligné TikTok (migration 0124)
      .nullable()
      .optional(),
    caption: z
      .string()
      .trim()
      .max(280)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    background: z.string().max(80).optional().transform((v) => v ?? null),
    filter: storyFilterSchema,
    caption_position: captionPositionSchema,
    stickers: stickersSchema,
  })
  .refine(
    (value) =>
      value.type !== "photo" || (value.photo_url && value.photo_url.length > 0),
    { message: "Photo requise.", path: ["photo_url"] },
  )
  .refine(
    (value) =>
      value.type !== "text" || (value.caption && value.caption.length > 0),
    { message: "Texte requis.", path: ["caption"] },
  )
  .refine(
    (value) =>
      value.type !== "video" || (value.video_url && value.video_url.length > 0),
    { message: "Vidéo requise.", path: ["video_url"] },
  );

export async function createStory(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const durationRaw = formData.get("video_duration_ms");
  const duration =
    typeof durationRaw === "string" && durationRaw.length > 0
      ? Number(durationRaw)
      : null;

  /* Parse JSON overlays côté server (resend en JSON.stringify côté composer). */
  const captionPositionRaw = formData.get("caption_position");
  const stickersRaw = formData.get("stickers");
  let captionPositionParsed: unknown = null;
  let stickersParsed: unknown = [];
  try {
    if (typeof captionPositionRaw === "string" && captionPositionRaw.length > 0) {
      captionPositionParsed = JSON.parse(captionPositionRaw);
    }
    if (typeof stickersRaw === "string" && stickersRaw.length > 0) {
      stickersParsed = JSON.parse(stickersRaw);
    }
  } catch {
    return { ok: false, error: "Overlays mal formés." };
  }

  /* Normalise string vide → null avant validation. Sinon z.string().url()
   * rejette les chaînes vides et l'user voit "Invalid url" alors qu'il
   * n'a juste pas uploadé (ou l'upload a échoué silencieusement). */
  const emptyToNull = (v: FormDataEntryValue | null): string | null =>
    typeof v === "string" && v.length > 0 ? v : null;

  const parsed = storySchema.safeParse({
    type: formData.get("type"),
    photo_url: emptyToNull(formData.get("photo_url")),
    video_url: emptyToNull(formData.get("video_url")),
    video_thumbnail_url: emptyToNull(formData.get("video_thumbnail_url")),
    video_duration_ms: duration,
    caption: formData.get("caption"),
    background: formData.get("background"),
    filter: formData.get("filter"),
    caption_position: captionPositionParsed,
    stickers: stickersParsed,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Story invalide.",
    };
  }

  const { error } = await supabase.from("stories").insert({
    author_id: user.id,
    type: parsed.data.type,
    photo_url: parsed.data.photo_url ?? null,
    video_url: parsed.data.video_url ?? null,
    video_thumbnail_url: parsed.data.video_thumbnail_url ?? null,
    video_duration_ms: parsed.data.video_duration_ms ?? null,
    caption: parsed.data.caption,
    background: parsed.data.background,
    filter: parsed.data.filter,
    /* Overlays uniquement pertinents pour les stories photo. Pour les autres
       types on persiste null/[] pour rester cohérent côté lecture. */
    caption_position:
      parsed.data.type === "photo"
        ? parsed.data.caption_position ?? null
        : null,
    stickers:
      parsed.data.type === "photo" ? parsed.data.stickers : [],
  });

  if (error) {
    console.error("[stories:createStory]", error);
    /* Message explicite pour aider au debug : check constraint, RLS,
     * colonne inexistante… apparaît dans le toast côté user. */
    return {
      ok: false,
      error: `Publication impossible : ${error.message ?? error.code ?? "raison inconnue"}`,
    };
  }

  revalidatePath("/feed");
  /* Pas de redirect server-side : le caller (StoryComposer) navigue
     lui-même via router.push en mode standalone, ou ferme le modal
     externe en mode embedded. Permet d'utiliser la même action dans
     le ContentCreatorModal universel. */
  return { ok: true };
}

export async function deleteStory(storyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("stories")
    .delete()
    .eq("id", storyId)
    .eq("author_id", user.id);

  revalidatePath("/feed");
  return { ok: true };
}

export async function recordStoryView(storyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("story_views")
    .insert({ story_id: storyId, viewer_id: user.id });

  return { ok: true };
}

/* Chantier Stories v2 — toggle like sur une story (idempotent).
 * 1 like par user par story max. Si déjà liké → DELETE. Sinon INSERT.
 * Le trigger SQL maintient likes_count. */
export async function toggleStoryLike(
  storyId: string,
): Promise<{ ok: true; liked: boolean } | { ok: false; error: string }> {
  const parsed = z.string().uuid().safeParse(storyId);
  if (!parsed.success) return { ok: false, error: "Story invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: existing } = await supabase
    .from("story_likes")
    .select("story_id")
    .eq("story_id", parsed.data)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("story_likes")
      .delete()
      .eq("story_id", parsed.data)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: "Unlike impossible." };
    return { ok: true, liked: false };
  }

  const { error } = await supabase
    .from("story_likes")
    .insert({ story_id: parsed.data, user_id: user.id });
  if (error) return { ok: false, error: "Like impossible." };
  return { ok: true, liked: true };
}

/* Chantier Stories v2 — envoyer une réponse texte à une story.
 * Le destinataire (auteur de la story) la verra dans son archive +
 * pourra ouvrir une conv DM si besoin. */
const storyReplySchema = z.object({
  storyId: z.string().uuid(),
  body: z.string().trim().min(1).max(500),
});

export async function addStoryReply(
  storyId: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = storyReplySchema.safeParse({ storyId, body });
  if (!parsed.success) {
    return { ok: false, error: "Réponse invalide (1-500 caractères)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("story_replies")
    .insert({
      story_id: parsed.data.storyId,
      author_id: user.id,
      body: parsed.data.body,
    });

  if (error) return { ok: false, error: "Envoi impossible." };
  return { ok: true };
}

/* Récupère la liste des viewers d'une story. Réservé à l'auteur via RLS
 * server-side : on check que current user = author. */
export type StoryViewerEntry = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  viewed_at: string;
  liked: boolean;
};

export async function listStoryViewersDetails(
  storyId: string,
): Promise<
  | { ok: true; viewers: StoryViewerEntry[] }
  | { ok: false; error: string }
> {
  const parsed = z.string().uuid().safeParse(storyId);
  if (!parsed.success) return { ok: false, error: "Story invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  /* Check ownership : seul l'auteur de la story voit les viewers. */
  const { data: story } = await supabase
    .from("stories")
    .select("author_id")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!story) return { ok: false, error: "Story introuvable." };
  if (story.author_id !== user.id) {
    return { ok: false, error: "Réservé à l'auteur." };
  }

  /* Fetch views + likes en parallèle. */
  const [{ data: views }, { data: likes }] = await Promise.all([
    supabase
      .from("story_views")
      .select("viewer_id, viewed_at")
      .eq("story_id", parsed.data)
      .order("viewed_at", { ascending: false })
      .limit(200),
    supabase
      .from("story_likes")
      .select("user_id")
      .eq("story_id", parsed.data),
  ]);

  const likedSet = new Set<string>(
    (likes ?? []).map((l) => l.user_id),
  );
  const viewerIds = Array.from(
    new Set((views ?? []).map((v) => v.viewer_id)),
  );

  if (viewerIds.length === 0) {
    return { ok: true, viewers: [] };
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", viewerIds);

  const profileById = new Map<
    string,
    { full_name: string | null; username: string | null; avatar_url: string | null }
  >();
  for (const p of profiles ?? []) profileById.set(p.id, p);

  const viewers: StoryViewerEntry[] = (views ?? []).map((v) => {
    const profile = profileById.get(v.viewer_id);
    return {
      user_id: v.viewer_id,
      full_name: profile?.full_name ?? null,
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
      viewed_at: v.viewed_at,
      liked: likedSet.has(v.viewer_id),
    };
  });

  return { ok: true, viewers };
}
