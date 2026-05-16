"use server";

/* Sprint I — Server Actions pour configurer le webhook sortant cercle. */

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const EVENTS = [
  "post.created",
  "post.deleted",
  "member.joined",
  "member.left",
  "report.opened",
] as const;

const upsertSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  url: z.string().url("URL invalide.").startsWith("https://", "L'URL doit être en HTTPS."),
  events: z.array(z.enum(EVENTS)).min(1, "Choisis au moins un événement."),
  isActive: z.boolean().default(true),
});

const deleteSchema = z.object({
  circleSlug: z.string().min(1),
  webhookId: z.string().uuid(),
});

export async function upsertCircleWebhook(
  args: z.infer<typeof upsertSchema>,
) {
  const parsed = upsertSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data: existing } = await (supabase as any)
    .from("circle_webhooks")
    .select("id, secret")
    .eq("circle_id", parsed.data.circleId)
    .maybeSingle();

  const secret = (existing as { secret?: string } | null)?.secret ?? crypto.randomBytes(32).toString("hex");

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { error } = await (supabase as any)
    .from("circle_webhooks")
    .upsert(
      {
        circle_id: parsed.data.circleId,
        url: parsed.data.url,
        secret,
        events_subscribed: parsed.data.events,
        is_active: parsed.data.isActive,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "circle_id" },
    );

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/circles/${parsed.data.circleSlug}/webhooks`);
  /* On retourne le secret uniquement à la création (premier upsert).
     Pour les updates, le secret reste accessible via la page admin. */
  return {
    ok: true as const,
    secret: existing ? null : secret,
  };
}

export async function deleteCircleWebhook(
  args: z.infer<typeof deleteSchema>,
) {
  const parsed = deleteSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { error } = await (supabase as any)
    .from("circle_webhooks")
    .delete()
    .eq("id", parsed.data.webhookId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/circles/${parsed.data.circleSlug}/webhooks`);
  return { ok: true as const };
}
