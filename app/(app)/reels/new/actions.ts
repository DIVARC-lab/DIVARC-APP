"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* Server action : crée un reel avec validation Zod stricte.
 *
 * V1 : on accepte une vidéo MP4 déjà uploadée vers Supabase Storage
 * (par le client). V1.5 : transcoding HLS via Mux (déclenché en
 * background après l'insert).
 */

const textOverlaySchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(100),
  start_s: z.number().min(0),
  end_s: z.number().positive(),
  x_pct: z.number().min(0).max(100),
  y_pct: z.number().min(0).max(100),
  font_size_px: z.number().min(12).max(200),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  weight: z.enum(["bold", "regular"]),
  bg: z.enum(["none", "solid", "outline"]),
  align: z.enum(["left", "center", "right"]),
});

const reelInputSchema = z.object({
  video_url: z.string().url(),
  duration_seconds: z.number().positive().max(90),
  poster_url: z.string().url().optional().nullable(),
  description: z.string().max(2200).optional(),
  hashtags: z.array(z.string().min(1).max(60)).max(20).default([]),
  sound_id: z.string().uuid().optional().nullable(),
  has_voiceover: z.boolean().default(false),
  audience: z.enum(["public", "friends", "private"]).default("public"),
  allow_comments: z.boolean().default(true),
  allow_duets: z.boolean().default(true),
  allow_stitches: z.boolean().default(true),
  allow_downloads: z.boolean().default(false),
  scheduled_for: z.string().datetime().optional().nullable(),
  text_overlays: z.array(textOverlaySchema).max(10).default([]),
  voiceover_url: z.string().url().optional().nullable(),
  video_volume: z.number().min(0).max(1).default(1),
  voiceover_volume: z.number().min(0).max(1).default(1),
  duet_source_reel_id: z.string().uuid().optional().nullable(),
  duet_layout: z.enum(["right", "left", "top", "bottom"]).optional().nullable(),
  stickers: z
    .array(
      z.object({
        id: z.string(),
        kind: z.enum(["emoji", "image"]),
        content: z.string().min(1).max(500),
        start_s: z.number().min(0),
        end_s: z.number().positive(),
        x_pct: z.number().min(0).max(100),
        y_pct: z.number().min(0).max(100),
        scale: z.number().min(0.2).max(3),
        rotation_deg: z.number().min(-180).max(180),
      }),
    )
    .max(10)
    .default([]),
  effects_used: z.array(z.string().min(1).max(40)).max(5).default([]),
});

export type CreateReelResult =
  | { ok: true; reel_id: string }
  | { ok: false; error: string };

export async function createReel(
  input: z.infer<typeof reelInputSchema>,
): Promise<CreateReelResult> {
  const parsed = reelInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Non authentifié." };
  }

  /* Programmation : si scheduled_for > now() + 5 min, status='scheduled'. */
  let status: "published" | "scheduled" = "published";
  let scheduledFor: string | null = null;
  if (data.scheduled_for) {
    const ms = new Date(data.scheduled_for).getTime();
    if (Number.isFinite(ms) && ms > Date.now() + 5 * 60 * 1000) {
      status = "scheduled";
      scheduledFor = new Date(ms).toISOString();
    }
  }

  /* Détection mentions @ dans la description (post_mentions équivalent). */
  const mentionedUsers: string[] = [];
  if (data.description) {
    const matches = data.description.match(/@([a-z0-9_]{2,30})/gi) ?? [];
    if (matches.length > 0) {
      const usernames = Array.from(
        new Set(matches.map((m) => m.slice(1).toLowerCase())),
      ).slice(0, 20);
      const { data: users } = await supabase
        .from("profiles")
        .select("id")
        .in("username", usernames);
      for (const u of (users ?? []) as Array<{ id: string }>) {
        mentionedUsers.push(u.id);
      }
    }
  }

  const { data: reel, error } = await supabase
    .from("reels")
    .insert({
      author_id: user.id,
      video_url: data.video_url,
      duration_seconds: data.duration_seconds,
      poster_url: data.poster_url ?? null,
      description: data.description ?? null,
      hashtags: data.hashtags,
      mentioned_users: mentionedUsers,
      sound_id: data.sound_id ?? null,
      has_voiceover: data.has_voiceover,
      audience: data.audience,
      allow_comments: data.allow_comments,
      allow_duets: data.allow_duets,
      allow_stitches: data.allow_stitches,
      allow_downloads: data.allow_downloads,
      status,
      scheduled_for: scheduledFor,
      moderation_status: "approved", // V1 : auto-approve. V1.5 : pipeline modération NSFW.
      text_overlays: data.text_overlays,
      voiceover_url: data.voiceover_url ?? null,
      video_volume: data.video_volume,
      voiceover_volume: data.voiceover_volume,
      duet_source_reel_id: data.duet_source_reel_id ?? null,
      duet_layout: data.duet_layout ?? null,
      stickers: data.stickers,
      effects_used: data.effects_used,
    })
    .select("id")
    .single();

  if (error || !reel) {
    console.error("[reels:createReel]", error);
    return { ok: false, error: "Création du reel échouée." };
  }

  /* Chantier Reels Recsys 5 — indexation embedding fire-and-forget. */
  if (status === "published") {
    void (async () => {
      const { indexReelEmbedding } = await import("@/lib/recsys/indexers");
      await indexReelEmbedding(
        supabase,
        reel.id,
        data.description ?? null,
        data.hashtags ?? null,
      );
    })();
  }

  revalidatePath("/reels");
  return { ok: true, reel_id: reel.id };
}

/* Helper redirect après création réussie. */
export async function redirectToReel(reelId: string) {
  redirect(`/reels/${reelId}`);
}
