"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* Étape 3.3 — actions facette créateur (V0069). */

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return { supabase, user };
}

// =====================================================
// CREATOR STATS (1 row par user)
// =====================================================

const creatorStatsSchema = z.object({
  total_views: z.number().int().min(0).default(0),
  total_likes: z.number().int().min(0).default(0),
  avg_engagement_rate: z.number().min(0).max(100).default(0),
  monthly_active_followers: z.number().int().min(0).default(0),
  primary_audience_age: z
    .enum(["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"])
    .nullable()
    .optional(),
  primary_audience_geo: z.array(z.string().min(2).max(60)).max(10).default([]),
  content_categories: z.array(z.string().min(1).max(40)).max(8).default([]),
});

export async function upsertCreatorStats(
  input: z.infer<typeof creatorStatsSchema>,
): Promise<ActionResult> {
  const parsed = creatorStatsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("creator_stats")
      .upsert(
        { user_id: user.id, ...parsed.data },
        { onConflict: "user_id" },
      );
    if (error) return { ok: false, error: "Sauvegarde échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

// =====================================================
// CREATOR FEATURED CONTENT
// =====================================================

const featuredSchema = z
  .object({
    content_type: z.enum(["post", "reel", "story_highlight", "external"]),
    post_id: z.string().uuid().nullable().optional(),
    reel_id: z.string().uuid().nullable().optional(),
    story_highlight_id: z.string().uuid().nullable().optional(),
    external_url: z.string().url().nullable().optional(),
    external_title: z.string().max(120).nullable().optional(),
    external_thumbnail_url: z.string().url().nullable().optional(),
    sort_position: z.number().int().min(0).default(0),
  })
  .refine(
    (d) => {
      const count =
        (d.post_id ? 1 : 0) +
        (d.reel_id ? 1 : 0) +
        (d.story_highlight_id ? 1 : 0) +
        (d.external_url ? 1 : 0);
      return count === 1;
    },
    {
      message: "Exactement une référence requise (post/reel/highlight/external).",
    },
  );

export async function createFeatured(
  input: z.infer<typeof featuredSchema>,
): Promise<ActionResult> {
  const parsed = featuredSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("creator_featured")
      .insert({ user_id: user.id, ...parsed.data });
    if (error) return { ok: false, error: "Création échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

export async function deleteFeatured(featuredId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("creator_featured")
      .delete()
      .eq("id", featuredId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: "Suppression échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

// =====================================================
// CREATOR COLLABORATIONS
// =====================================================

const collabSchema = z.object({
  brand_name: z.string().min(1).max(120),
  brand_company_id: z.string().uuid().nullable().optional(),
  brand_logo_url: z.string().url().nullable().optional(),
  collaboration_type: z
    .enum([
      "sponsorship", "partnership", "ambassador", "affiliate",
      "placement", "review", "event", "other",
    ])
    .nullable()
    .optional(),
  start_month: z.string().nullable().optional(),
  end_month: z.string().nullable().optional(),
  is_ongoing: z.boolean().default(false),
  description: z.string().max(500).nullable().optional(),
});

export async function createCollaboration(
  input: z.infer<typeof collabSchema>,
): Promise<ActionResult> {
  const parsed = collabSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("creator_collaborations")
      .insert({ user_id: user.id, ...parsed.data });
    if (error) return { ok: false, error: "Création échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

export async function deleteCollaboration(collabId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("creator_collaborations")
      .delete()
      .eq("id", collabId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: "Suppression échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

// =====================================================
// CREATOR MEDIA KIT (1 row par user)
// =====================================================

const mediaKitSchema = z.object({
  is_open_to_partnerships: z.boolean().default(false),
  rate_post_amount: z.number().min(0).nullable().optional(),
  rate_reel_amount: z.number().min(0).nullable().optional(),
  rate_story_amount: z.number().min(0).nullable().optional(),
  rate_currency: z
    .enum(["EUR", "USD", "XAF", "XOF", "MAD", "TND", "DZD", "CAD", "CHF", "GBP"])
    .nullable()
    .optional(),
  contact_email: z.string().email().nullable().optional(),
  booking_url: z.string().url().nullable().optional(),
  media_kit_pdf_url: z.string().url().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function upsertMediaKit(
  input: z.infer<typeof mediaKitSchema>,
): Promise<ActionResult> {
  const parsed = mediaKitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("creator_media_kit")
      .upsert(
        { user_id: user.id, ...parsed.data },
        { onConflict: "user_id" },
      );
    if (error) return { ok: false, error: "Sauvegarde échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}
