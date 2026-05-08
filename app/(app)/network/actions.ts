"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const sendSchema = z.object({
  recipient_id: z.string().uuid(),
  context: z
    .enum(["colleague", "manager", "report", "client", "partner", "other"])
    .nullable()
    .optional(),
  intro: z.string().trim().max(500).nullable().optional(),
});

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendProConnection(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const parsed = sendSchema.safeParse({
    recipient_id: formData.get("recipient_id"),
    context: (formData.get("context") as string | null) || null,
    intro: (formData.get("intro") as string | null) || null,
  });
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const { error } = await supabase.rpc("send_pro_connection", {
    recipient_user_id: parsed.data.recipient_id,
    context_value: parsed.data.context ?? null,
    intro_value: parsed.data.intro ?? null,
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return { ok: false, error: "Une demande existe déjà avec cette personne." };
    }
    return { ok: false, error: "Envoi impossible." };
  }

  revalidatePath("/network");
  return { ok: true };
}

export async function respondProConnection(
  connectionId: string,
  status: "accepted" | "rejected",
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("pro_connections")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", connectionId)
    .eq("recipient_id", user.id);
  if (error) return { ok: false, error: "Réponse impossible." };

  revalidatePath("/network");
  return { ok: true };
}

export async function deleteProConnection(
  connectionId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("pro_connections")
    .delete()
    .eq("id", connectionId)
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);
  if (error) return { ok: false, error: "Suppression impossible." };

  revalidatePath("/network");
  return { ok: true };
}
