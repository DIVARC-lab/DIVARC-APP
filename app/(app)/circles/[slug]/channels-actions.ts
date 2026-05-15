"use server";

/* Server Actions pour la gestion des channels cercles.
 *
 * RLS DB (circle_channels_admin policy) exige is_circle_admin pour
 * INSERT/UPDATE/DELETE. On double avec un check côté code pour un
 * message d'erreur clair. */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

const slugRegex = /^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$/;

const channelTypeSchema = z.enum(["text", "announcement", "forum"]);

const createSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  name: z.string().trim().min(2).max(50),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(slugRegex, "Slug : 2-32 caractères, a-z 0-9 et tirets uniquement."),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  channel_type: channelTypeSchema.default("text"),
});

const updateSchema = z.object({
  circleSlug: z.string().min(1),
  channelId: z.string().uuid(),
  name: z.string().trim().min(2).max(50).optional(),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v === undefined ? undefined : v.length > 0 ? v : null)),
  channel_type: channelTypeSchema.optional(),
});

const archiveSchema = z.object({
  circleSlug: z.string().min(1),
  channelId: z.string().uuid(),
});

const reorderSchema = z.object({
  circleSlug: z.string().min(1),
  channelId: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

async function assertCircleAdmin(
  supabase: SupabaseAny,
  circleId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: m } = await supabase
    .from("circle_members")
    .select("role")
    .eq("circle_id", circleId)
    .eq("user_id", userId)
    .maybeSingle();
  const role = (m as { role?: string } | null)?.role ?? null;
  if (role === "owner" || role === "admin") return { ok: true };
  return { ok: false, error: "Réservé aux admins du cercle." };
}

export async function createCircleChannel(
  args: z.infer<typeof createSchema>,
) {
  const parsed = createSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const admin = await assertCircleAdmin(supabase, parsed.data.circleId, user.id);
  if (!admin.ok) return { ok: false as const, error: admin.error };

  /* Position = max(position) + 1 pour mettre le nouveau channel à la fin. */
  const { data: maxRow } = await (supabase as SupabaseAny)
    .from("circle_channels")
    .select("position")
    .eq("circle_id", parsed.data.circleId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition =
    ((maxRow as { position?: number } | null)?.position ?? -1) + 1;

  const { error } = await (supabase as SupabaseAny)
    .from("circle_channels")
    .insert({
      circle_id: parsed.data.circleId,
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description,
      channel_type: parsed.data.channel_type,
      position: nextPosition,
    });

  if (error) {
    /* Erreur slug dupliqué = unique constraint. */
    if (error.code === "23505") {
      return { ok: false as const, error: "Ce slug existe déjà dans ce cercle." };
    }
    return { ok: false as const, error: error.message ?? "Création impossible." };
  }

  revalidatePath(`/circles/${parsed.data.circleSlug}/channels`);
  revalidatePath(`/circles/${parsed.data.circleSlug}`);
  return { ok: true as const };
}

export async function updateCircleChannel(
  args: z.infer<typeof updateSchema>,
) {
  const parsed = updateSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* On récupère le circle_id depuis le channel pour vérifier le rôle. */
  const { data: ch } = await (supabase as SupabaseAny)
    .from("circle_channels")
    .select("circle_id")
    .eq("id", parsed.data.channelId)
    .maybeSingle();
  const circleId = (ch as { circle_id?: string } | null)?.circle_id;
  if (!circleId) return { ok: false as const, error: "Channel introuvable." };

  const admin = await assertCircleAdmin(supabase, circleId, user.id);
  if (!admin.ok) return { ok: false as const, error: admin.error };

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    patch.description = parsed.data.description;
  if (parsed.data.channel_type !== undefined)
    patch.channel_type = parsed.data.channel_type;
  if (Object.keys(patch).length === 0) {
    return { ok: true as const };
  }
  patch.updated_at = new Date().toISOString();

  const { error } = await (supabase as SupabaseAny)
    .from("circle_channels")
    .update(patch)
    .eq("id", parsed.data.channelId);

  if (error) return { ok: false as const, error: error.message ?? "Échec mise à jour." };

  revalidatePath(`/circles/${parsed.data.circleSlug}/channels`);
  revalidatePath(`/circles/${parsed.data.circleSlug}`);
  return { ok: true as const };
}

export async function archiveCircleChannel(
  args: z.infer<typeof archiveSchema>,
) {
  const parsed = archiveSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalide" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* Récupère le slug du channel pour vérifier qu'on ne tue pas le
     channel "general" (toujours présent pour back-compat). */
  const { data: ch } = await (supabase as SupabaseAny)
    .from("circle_channels")
    .select("circle_id, slug")
    .eq("id", parsed.data.channelId)
    .maybeSingle();
  const channel = ch as { circle_id?: string; slug?: string } | null;
  if (!channel?.circle_id) {
    return { ok: false as const, error: "Channel introuvable." };
  }
  if (channel.slug === "general") {
    return {
      ok: false as const,
      error: "Le channel « Général » ne peut pas être archivé.",
    };
  }

  const admin = await assertCircleAdmin(supabase, channel.circle_id, user.id);
  if (!admin.ok) return { ok: false as const, error: admin.error };

  const { error } = await (supabase as SupabaseAny)
    .from("circle_channels")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data.channelId);

  if (error) return { ok: false as const, error: error.message ?? "Échec archivage." };

  revalidatePath(`/circles/${parsed.data.circleSlug}/channels`);
  revalidatePath(`/circles/${parsed.data.circleSlug}`);
  return { ok: true as const };
}

export async function reorderCircleChannel(
  args: z.infer<typeof reorderSchema>,
) {
  const parsed = reorderSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalide" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { data: current } = await (supabase as SupabaseAny)
    .from("circle_channels")
    .select("id, circle_id, position")
    .eq("id", parsed.data.channelId)
    .maybeSingle();
  const cur = current as
    | { id: string; circle_id: string; position: number }
    | null;
  if (!cur) return { ok: false as const, error: "Channel introuvable." };

  const admin = await assertCircleAdmin(supabase, cur.circle_id, user.id);
  if (!admin.ok) return { ok: false as const, error: admin.error };

  /* Trouve le voisin selon la direction (position juste avant ou après). */
  const direction = parsed.data.direction;
  const neighborQuery = (supabase as SupabaseAny)
    .from("circle_channels")
    .select("id, position")
    .eq("circle_id", cur.circle_id)
    .is("archived_at", null);

  const { data: neighborRow } =
    direction === "up"
      ? await neighborQuery
          .lt("position", cur.position)
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle()
      : await neighborQuery
          .gt("position", cur.position)
          .order("position", { ascending: true })
          .limit(1)
          .maybeSingle();
  const neighbor = neighborRow as
    | { id: string; position: number }
    | null;

  if (!neighbor) {
    /* Déjà à l'extrémité — no-op silencieux. */
    return { ok: true as const };
  }

  /* Swap positions. */
  const { error: e1 } = await (supabase as SupabaseAny)
    .from("circle_channels")
    .update({ position: neighbor.position })
    .eq("id", cur.id);
  if (e1) return { ok: false as const, error: e1.message ?? "Échec swap." };

  const { error: e2 } = await (supabase as SupabaseAny)
    .from("circle_channels")
    .update({ position: cur.position })
    .eq("id", neighbor.id);
  if (e2) return { ok: false as const, error: e2.message ?? "Échec swap." };

  revalidatePath(`/circles/${parsed.data.circleSlug}/channels`);
  revalidatePath(`/circles/${parsed.data.circleSlug}`);
  return { ok: true as const };
}
