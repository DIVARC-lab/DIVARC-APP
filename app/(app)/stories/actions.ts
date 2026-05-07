"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const storySchema = z
  .object({
    type: z.enum(["photo", "text"]),
    photo_url: z.string().url().nullable().optional(),
    caption: z
      .string()
      .trim()
      .max(280)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    background: z.string().max(80).optional().transform((v) => v ?? null),
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
  );

export async function createStory(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const parsed = storySchema.safeParse({
    type: formData.get("type"),
    photo_url: formData.get("photo_url"),
    caption: formData.get("caption"),
    background: formData.get("background"),
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
    caption: parsed.data.caption,
    background: parsed.data.background,
  });

  if (error) {
    return { ok: false, error: "Publication impossible." };
  }

  revalidatePath("/feed");
  redirect("/feed");
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
