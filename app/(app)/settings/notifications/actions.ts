"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const prefsSchema = z.object({
  friend_requests: z.boolean(),
  messages: z.boolean(),
  mentions: z.boolean(),
  likes: z.boolean(),
  comments: z.boolean(),
  moderation: z.boolean(),
  system: z.boolean(),
});

export type NotificationPrefsState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function updateNotificationPreferences(
  _prev: NotificationPrefsState | undefined,
  formData: FormData,
): Promise<NotificationPrefsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Tu dois être connecté." };
  }

  const parsed = prefsSchema.safeParse({
    friend_requests: formData.get("friend_requests") === "on",
    messages: formData.get("messages") === "on",
    mentions: formData.get("mentions") === "on",
    likes: formData.get("likes") === "on",
    comments: formData.get("comments") === "on",
    moderation: formData.get("moderation") === "on",
    system: formData.get("system") === "on",
  });

  if (!parsed.success) {
    return { status: "error", message: "Champs invalides." };
  }

  const { error } = await supabase
    .from("user_notification_preferences")
    .upsert(
      { user_id: user.id, ...parsed.data, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

  if (error) {
    console.error("[notif:prefs:update]", error);
    return { status: "error", message: "Sauvegarde impossible." };
  }

  revalidatePath("/settings/notifications");
  return { status: "success", message: "Préférences enregistrées." };
}
