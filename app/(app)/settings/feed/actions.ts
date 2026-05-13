"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const settingsSchema = z.object({
  anti_doomscroll_enabled: z.boolean(),
  author_diversity_enabled: z.boolean(),
  signal_filter_enabled: z.boolean(),
  default_feed_mode: z.enum([
    "fresh",
    "conversations",
    "rising_voices",
    "inner_circle",
    "raw",
  ]),
});

export type FeedSettingsFormState = {
  status: "idle" | "success" | "error";
  error?: string;
};

export async function updateFeedSettings(
  _prev: FeedSettingsFormState | undefined,
  formData: FormData,
): Promise<FeedSettingsFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "Tu dois être connecté." };

  const parsed = settingsSchema.safeParse({
    anti_doomscroll_enabled: formData.get("anti_doomscroll_enabled") === "on",
    author_diversity_enabled: formData.get("author_diversity_enabled") === "on",
    signal_filter_enabled: formData.get("signal_filter_enabled") === "on",
    default_feed_mode: formData.get("default_feed_mode") ?? "fresh",
  });

  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Champs invalides.",
    };
  }

  const { error } = await supabase
    .from("user_algorithm_settings")
    .upsert(
      {
        user_id: user.id,
        ...parsed.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return {
      status: "error",
      error: error.message,
    };
  }

  revalidatePath("/settings/feed");
  revalidatePath("/feed");
  return { status: "success" };
}
