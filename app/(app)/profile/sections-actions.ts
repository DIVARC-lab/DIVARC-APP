"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* Server actions étape 3.2 — CRUD des nouvelles sections de profil :
 *   - story_highlights + items (V0064)
 *   - profile_recommendations (V0065)
 *   - profile_projects (V0066)
 *   - profile_publications (V0066)
 *   - profile_volunteer (V0066)
 *   - profile_awards (V0066)
 *   - profile_open_to_work (V0066)
 *
 * Pattern uniforme : Zod stricte, return { ok, error } simple. La page
 * appelante revalidatePath + toast. */

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
// STORY HIGHLIGHTS
// =====================================================

const highlightCreateSchema = z.object({
  title: z.string().min(1).max(60),
  cover_image_url: z.string().url(),
  story_ids: z.array(z.string().uuid()).min(1).max(50),
});

export async function createHighlight(
  input: z.infer<typeof highlightCreateSchema>,
): Promise<ActionResult> {
  const parsed = highlightCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide." };
  }
  try {
    const { supabase, user } = await requireUser();
    /* Insert highlight + items en cascade. */
    const { data: highlight, error: hErr } = await supabase
      .from("story_highlights")
      .insert({
        user_id: user.id,
        title: parsed.data.title,
        cover_image_url: parsed.data.cover_image_url,
      })
      .select("id")
      .single();
    if (hErr || !highlight) {
      return { ok: false, error: "Création échouée." };
    }
    const items = parsed.data.story_ids.map((sid, idx) => ({
      highlight_id: highlight.id,
      story_id: sid,
      sort_position: idx,
    }));
    const { error: iErr } = await supabase
      .from("story_highlight_items")
      .insert(items);
    if (iErr) {
      console.error("[createHighlight:items]", iErr);
      /* On garde le highlight, juste avec moins d'items */
    }
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch (err) {
    console.error("[createHighlight]", err);
    return { ok: false, error: "Erreur serveur." };
  }
}

export async function updateHighlight(
  highlightId: string,
  patch: { title?: string; cover_image_url?: string; sort_position?: number },
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const safe: {
      title?: string;
      cover_image_url?: string;
      sort_position?: number;
    } = {};
    if (patch.title !== undefined) {
      if (patch.title.length < 1 || patch.title.length > 60) {
        return { ok: false, error: "Titre 1-60 chars." };
      }
      safe.title = patch.title;
    }
    if (patch.cover_image_url !== undefined) {
      safe.cover_image_url = patch.cover_image_url;
    }
    if (patch.sort_position !== undefined) {
      safe.sort_position = patch.sort_position;
    }
    const { error } = await supabase
      .from("story_highlights")
      .update(safe)
      .eq("id", highlightId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: "Mise à jour échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

export async function deleteHighlight(
  highlightId: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("story_highlights")
      .delete()
      .eq("id", highlightId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: "Suppression échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

export async function addStoryToHighlight(
  highlightId: string,
  storyId: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    /* Vérifier ownership du highlight côté RLS. */
    const { error } = await supabase
      .from("story_highlight_items")
      .insert({ highlight_id: highlightId, story_id: storyId });
    if (error) {
      if (/duplicate/i.test(error.message)) {
        return { ok: false, error: "Story déjà dans ce highlight." };
      }
      return { ok: false, error: "Ajout échoué." };
    }
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

export async function removeStoryFromHighlight(
  highlightId: string,
  storyId: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("story_highlight_items")
      .delete()
      .eq("highlight_id", highlightId)
      .eq("story_id", storyId);
    if (error) return { ok: false, error: "Suppression échouée." };
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

// =====================================================
// RECOMMENDATIONS
// =====================================================

const recoCreateSchema = z.object({
  to_user_id: z.string().uuid(),
  relationship: z.enum([
    "manager", "report", "colleague", "client", "supplier",
    "mentor", "mentee", "classmate", "professor", "student",
    "collaborator", "business_partner", "friend", "custom",
  ]),
  relationship_custom: z.string().max(60).nullable().optional(),
  body: z.string().min(30).max(3000),
});

export async function createRecommendation(
  input: z.infer<typeof recoCreateSchema>,
): Promise<ActionResult> {
  const parsed = recoCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide." };
  }
  try {
    const { supabase, user } = await requireUser();
    if (parsed.data.to_user_id === user.id) {
      return { ok: false, error: "Auto-recommandation interdite." };
    }
    const { error } = await supabase
      .from("profile_recommendations")
      .insert({
        from_user_id: user.id,
        to_user_id: parsed.data.to_user_id,
        relationship: parsed.data.relationship,
        relationship_custom: parsed.data.relationship_custom ?? null,
        body: parsed.data.body,
        is_visible: false, // destinataire doit toggle pour publier
      });
    if (error) {
      if (/duplicate/i.test(error.message)) {
        return { ok: false, error: "Tu as déjà recommandé cet utilisateur." };
      }
      return { ok: false, error: "Création échouée." };
    }
    revalidatePath(`/u/${parsed.data.to_user_id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

export async function updateRecommendation(
  recoId: string,
  patch: {
    relationship?: z.infer<typeof recoCreateSchema>["relationship"];
    relationship_custom?: string | null;
    body?: string;
  },
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const safe: {
      relationship?: z.infer<typeof recoCreateSchema>["relationship"];
      relationship_custom?: string | null;
      body?: string;
    } = {};
    if (patch.relationship !== undefined) safe.relationship = patch.relationship;
    if (patch.relationship_custom !== undefined) {
      safe.relationship_custom = patch.relationship_custom;
    }
    if (patch.body !== undefined) {
      if (patch.body.length < 30 || patch.body.length > 3000) {
        return { ok: false, error: "Texte 30-3000 chars." };
      }
      safe.body = patch.body;
    }
    const { error } = await supabase
      .from("profile_recommendations")
      .update(safe)
      .eq("id", recoId);
    if (error) return { ok: false, error: "Mise à jour échouée." };
    revalidatePath("/profile");
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

export async function deleteRecommendation(
  recoId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("profile_recommendations")
      .delete()
      .eq("id", recoId);
    if (error) return { ok: false, error: "Suppression échouée." };
    revalidatePath("/profile");
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

/* Destinataire toggle visibility (RPC security definer) */
export async function toggleRecommendationVisibility(
  recoId: string,
  visible: boolean,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.rpc("toggle_recommendation_visibility", {
      p_reco_id: recoId,
      p_visible: visible,
    });
    if (error) return { ok: false, error: "Action échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

// =====================================================
// PROJECTS
// =====================================================

const projectSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(4000).nullable().optional(),
  start_month: z.string().nullable().optional(), // ISO YYYY-MM-DD
  end_month: z.string().nullable().optional(),
  is_ongoing: z.boolean().default(false),
  demo_url: z.string().url().nullable().optional(),
  source_url: z.string().url().nullable().optional(),
  tech_tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  media_urls: z.array(z.string().url()).max(10).default([]),
});

export async function createProject(
  input: z.infer<typeof projectSchema>,
): Promise<ActionResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("profile_projects")
      .insert({ user_id: user.id, ...parsed.data });
    if (error) return { ok: false, error: "Création échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

export async function updateProject(
  projectId: string,
  patch: Partial<z.infer<typeof projectSchema>>,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("profile_projects")
      .update(patch)
      .eq("id", projectId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: "Mise à jour échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("profile_projects")
      .delete()
      .eq("id", projectId)
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
// PUBLICATIONS
// =====================================================

const publicationSchema = z.object({
  title: z.string().min(1).max(200),
  media_type: z.enum([
    "book", "article", "podcast", "research_paper",
    "blog_post", "white_paper", "other",
  ]),
  publisher: z.string().max(120).nullable().optional(),
  publication_date: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  co_author_user_ids: z.array(z.string().uuid()).max(10).default([]),
  co_authors_text: z.array(z.string().max(120)).max(10).default([]),
  cover_image_url: z.string().url().nullable().optional(),
});

export async function createPublication(
  input: z.infer<typeof publicationSchema>,
): Promise<ActionResult> {
  const parsed = publicationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("profile_publications")
      .insert({ user_id: user.id, ...parsed.data });
    if (error) return { ok: false, error: "Création échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

export async function deletePublication(
  publicationId: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("profile_publications")
      .delete()
      .eq("id", publicationId)
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
// VOLUNTEER
// =====================================================

const volunteerSchema = z.object({
  organization: z.string().min(1).max(160),
  cause: z.string().max(80).nullable().optional(),
  role: z.string().min(1).max(120),
  start_month: z.string(),
  end_month: z.string().nullable().optional(),
  is_current: z.boolean().default(false),
  description: z.string().max(2000).nullable().optional(),
});

export async function createVolunteer(
  input: z.infer<typeof volunteerSchema>,
): Promise<ActionResult> {
  const parsed = volunteerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("profile_volunteer")
      .insert({ user_id: user.id, ...parsed.data });
    if (error) return { ok: false, error: "Création échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

export async function deleteVolunteer(
  volunteerId: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("profile_volunteer")
      .delete()
      .eq("id", volunteerId)
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
// AWARDS
// =====================================================

const awardSchema = z.object({
  title: z.string().min(1).max(160),
  issuer: z.string().max(120).nullable().optional(),
  issued_date: z.string().nullable().optional(),
  description: z.string().max(1500).nullable().optional(),
  url: z.string().url().nullable().optional(),
});

export async function createAward(
  input: z.infer<typeof awardSchema>,
): Promise<ActionResult> {
  const parsed = awardSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("profile_awards")
      .insert({ user_id: user.id, ...parsed.data });
    if (error) return { ok: false, error: "Création échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

export async function deleteAward(awardId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("profile_awards")
      .delete()
      .eq("id", awardId)
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
// OPEN TO WORK (1 row par user, upsert)
// =====================================================

const openToWorkSchema = z.object({
  job_titles: z.array(z.string().min(1).max(80)).max(10).default([]),
  locations: z.array(z.string().min(1).max(100)).max(10).default([]),
  work_types: z
    .array(
      z.enum([
        "fulltime",
        "parttime",
        "contract",
        "temporary",
        "volunteer",
        "internship",
        "remote",
      ]),
    )
    .default([]),
  industries: z.array(z.string().min(1).max(60)).max(10).default([]),
  start_date_preference: z
    .enum(["immediately", "within_1_month", "within_3_months", "flexible"])
    .nullable()
    .optional(),
  visibility: z
    .enum(["all_members", "recruiters_only", "hidden"])
    .default("all_members"),
  note: z.string().max(500).nullable().optional(),
});

export async function upsertOpenToWork(
  input: z.infer<typeof openToWorkSchema>,
): Promise<ActionResult> {
  const parsed = openToWorkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("profile_open_to_work")
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

export async function deleteOpenToWork(): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("profile_open_to_work")
      .delete()
      .eq("user_id", user.id);
    if (error) return { ok: false, error: "Suppression échouée." };
    /* Reset aussi le boolean profiles.open_to_work pour cohérence */
    await supabase
      .from("profiles")
      .update({ open_to_work: false })
      .eq("id", user.id);
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

// =====================================================
// BADGES (visibility toggle)
// =====================================================
export async function toggleBadgeVisibility(
  badgeId: string,
  visible: boolean,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.rpc("toggle_badge_visibility", {
      p_badge_id: badgeId,
      p_visible: visible,
    });
    if (error) return { ok: false, error: "Action échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}
