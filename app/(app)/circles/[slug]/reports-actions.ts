"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* Sprint J — Server Actions reports cercle. */

const createSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  targetKind: z.enum(["post", "comment", "chat_message", "member"]),
  targetId: z.string().uuid(),
  reason: z.enum([
    "spam", "harassment", "hate_speech", "nsfw",
    "misinfo", "self_harm", "other",
  ]),
  note: z.string().trim().max(1000).optional().transform((v) =>
    v && v.length > 0 ? v : null,
  ),
});

const resolveSchema = z.object({
  circleSlug: z.string().min(1),
  reportId: z.string().uuid(),
  resolutionKind: z.enum([
    "content_removed", "member_warned", "member_muted",
    "member_banned", "no_action",
  ]),
});

const dismissSchema = z.object({
  circleSlug: z.string().min(1),
  reportId: z.string().uuid(),
});

export async function reportCircleContent(
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

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { error } = await (supabase as any)
    .from("circle_reports")
    .insert({
      circle_id: parsed.data.circleId,
      reporter_id: user.id,
      target_kind: parsed.data.targetKind,
      target_id: parsed.data.targetId,
      reason: parsed.data.reason,
      note: parsed.data.note,
    });
  if (error) return { ok: false as const, error: error.message };

  return { ok: true as const };
}

export async function resolveCircleReport(
  args: z.infer<typeof resolveSchema>,
) {
  const parsed = resolveSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { error } = await (supabase as any)
    .from("circle_reports")
    .update({
      status: "resolved",
      resolution_kind: parsed.data.resolutionKind,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.reportId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/circles/${parsed.data.circleSlug}/moderation/reports`);
  return { ok: true as const };
}

export async function dismissCircleReport(
  args: z.infer<typeof dismissSchema>,
) {
  const parsed = dismissSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { error } = await (supabase as any)
    .from("circle_reports")
    .update({
      status: "dismissed",
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.reportId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/circles/${parsed.data.circleSlug}/moderation/reports`);
  return { ok: true as const };
}
