"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const COLOR_VALUES = [
  "gold",
  "navy",
  "emerald",
  "rose",
  "violet",
  "cream",
] as const;

const slugFromName = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  emoji: z
    .string()
    .trim()
    .max(8)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  color: z.enum(COLOR_VALUES).optional().transform((v) => v ?? null),
  is_private: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

export async function createCircle(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    emoji: formData.get("emoji"),
    color: formData.get("color"),
    is_private: formData.get("is_private"),
  });

  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Cercle invalide.",
    };
  }

  let slug = slugFromName(parsed.data.name);
  if (slug.length < 2) slug = `cercle-${Date.now().toString(36).slice(-6)}`;

  /* Try insert; if slug collides, retry with -2, -3, ... up to 5 attempts. */
  let attempt = 0;
  let lastError: { message: string } | null = null;
  while (attempt < 5) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
    const { data, error } = await supabase
      .from("circles")
      .insert({
        slug: candidate,
        name: parsed.data.name,
        description: parsed.data.description,
        emoji: parsed.data.emoji,
        color: parsed.data.color,
        is_private: parsed.data.is_private,
        owner_id: user.id,
      })
      .select("slug")
      .single();
    if (!error && data) {
      revalidatePath("/circles");
      redirect(`/circles/${data.slug}`);
    }
    lastError = error ?? null;
    if (error?.code !== "23505") break;
    attempt++;
  }

  return {
    ok: false as const,
    error: lastError?.message ?? "Création impossible.",
  };
}

export async function joinCircle(circleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { error } = await supabase
    .from("circle_members")
    .insert({ circle_id: circleId, user_id: user.id, role: "member" });

  if (error) {
    return {
      ok: false as const,
      error: error.code === "23505" ? "Tu es déjà membre." : "Impossible de rejoindre.",
    };
  }

  revalidatePath("/circles");
  return { ok: true as const };
}

export async function leaveCircle(circleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { error } = await supabase
    .from("circle_members")
    .delete()
    .eq("circle_id", circleId)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, error: "Impossible de quitter." };

  revalidatePath("/circles");
  return { ok: true as const };
}
