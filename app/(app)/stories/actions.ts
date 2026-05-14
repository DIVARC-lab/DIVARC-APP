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
      .max(30_000)
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
    return { ok: false, error: "Publication impossible." };
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
