"use server";

/* Server Actions Hubs (méta-cercles). */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const createSchema = z.object({
  name: z.string().min(2).max(80),
  tagline: z.string().max(140).optional(),
  description: z.string().max(4000).optional(),
  emoji: z.string().max(8).optional(),
  colorAccent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  primaryCategory: z.string().max(80).optional(),
  tags: z.array(z.string().max(40)).max(10).default([]),
  visibility: z.enum(["public", "unlisted"]).default("public"),
  joinPolicy: z.enum(["open", "approval"]).default("approval"),
});

export async function createHub(args: z.infer<typeof createSchema>) {
  const parsed = createSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  let slug = slugFromName(parsed.data.name);
  if (slug.length < 2) slug = `hub-${Date.now().toString(36).slice(-6)}`;

  /* Retry on slug conflict. */
  let attempt = 0;
  while (attempt < 5) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
    const { data, error } = await (supabase as SupabaseAny)
      .from("circle_hubs")
      .insert({
        slug: candidate,
        name: parsed.data.name,
        tagline: parsed.data.tagline ?? null,
        description: parsed.data.description ?? null,
        emoji: parsed.data.emoji ?? null,
        color_accent: parsed.data.colorAccent ?? "#C9A961",
        owner_id: user.id,
        primary_category: parsed.data.primaryCategory ?? null,
        tags: parsed.data.tags,
        visibility: parsed.data.visibility,
        join_policy: parsed.data.joinPolicy,
      })
      .select("id, slug")
      .single();

    if (!error && data) {
      revalidatePath("/circles/hubs");
      return { ok: true as const, id: data.id, slug: data.slug };
    }

    if (error && error.code === "23505") {
      attempt++;
      continue;
    }

    return { ok: false as const, error: error?.message ?? "Création impossible" };
  }
  return { ok: false as const, error: "Trop de tentatives — slug non disponible" };
}

const proposeSchema = z.object({
  hubId: z.string().uuid(),
  hubSlug: z.string().min(1),
  circleId: z.string().uuid(),
});

export async function proposeCircleToHub(args: z.infer<typeof proposeSchema>) {
  const parsed = proposeSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  /* Vérifie hub join_policy. */
  const { data: hub } = await (supabase as SupabaseAny)
    .from("circle_hubs")
    .select("join_policy")
    .eq("id", parsed.data.hubId)
    .maybeSingle();
  if (!hub) return { ok: false as const, error: "Hub introuvable" };

  const initialStatus = hub.join_policy === "open" ? "approved" : "pending";

  const { error } = await (supabase as SupabaseAny)
    .from("circle_hub_circles")
    .insert({
      hub_id: parsed.data.hubId,
      circle_id: parsed.data.circleId,
      status: initialStatus,
      proposed_by: user.id,
      approved_by: initialStatus === "approved" ? user.id : null,
      approved_at: initialStatus === "approved" ? new Date().toISOString() : null,
    });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/circles/hubs/${parsed.data.hubSlug}`);
  return { ok: true as const, status: initialStatus };
}

const decideSchema = z.object({
  hubId: z.string().uuid(),
  hubSlug: z.string().min(1),
  circleId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});

export async function decideCircleHubMembership(
  args: z.infer<typeof decideSchema>,
) {
  const parsed = decideSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const { error } = await (supabase as SupabaseAny)
    .from("circle_hub_circles")
    .update({
      status: parsed.data.decision,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("hub_id", parsed.data.hubId)
    .eq("circle_id", parsed.data.circleId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/circles/hubs/${parsed.data.hubSlug}`);
  return { ok: true as const };
}
