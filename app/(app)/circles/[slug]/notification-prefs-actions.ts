"use server";

/* Sprint D.2 — Server Actions pour les préférences notif par cercle.
 *
 * - setCircleNotificationMode : upsert mode (all/mentions_only/muted)
 *   pour le user courant sur un cercle.
 * - getMyCircleNotificationMode : retourne le mode actif (défaut 'all').
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { CircleNotificationMode } from "@/lib/database.types";

const modeSchema = z.enum(["all", "mentions_only", "muted"]);

const setSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  mode: modeSchema,
});

export async function setCircleNotificationMode(
  args: z.infer<typeof setSchema>,
) {
  const parsed = setSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: "Mode invalide." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { error } = await (supabase as any)
    .from("circle_notification_preferences")
    .upsert(
      {
        user_id: user.id,
        circle_id: parsed.data.circleId,
        mode: parsed.data.mode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,circle_id" },
    );

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/circles/${parsed.data.circleSlug}/notifications`);
  return { ok: true as const, mode: parsed.data.mode };
}

export async function getMyCircleNotificationMode(
  circleId: string,
): Promise<CircleNotificationMode> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "all";

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data } = await (supabase as any)
    .from("circle_notification_preferences")
    .select("mode")
    .eq("user_id", user.id)
    .eq("circle_id", circleId)
    .maybeSingle();
  return ((data as { mode?: CircleNotificationMode } | null)?.mode ??
    "all") as CircleNotificationMode;
}
