"use server";

/* Server Actions pour les appels (Chantier 2.1).
 *
 * Wrappers minces autour des RPC migration 0076. Le SDP/ICE exchange
 * passe par Supabase Realtime côté client, pas par ces actions. */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { CallKind, CallStatus } from "@/lib/calls/types";

const idSchema = z.string().uuid();

export type CallActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createCallSession(
  conversationId: string,
  kind: CallKind = "audio",
): Promise<CallActionResult<{ callId: string }>> {
  const parsed = idSchema.safeParse(conversationId);
  if (!parsed.success) return { ok: false, error: "Conversation invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data, error } = await supabase.rpc("create_call_session", {
    p_conversation_id: parsed.data,
    p_kind: kind,
  });

  if (error || !data) {
    console.error("[createCallSession]", error);
    return { ok: false, error: "Impossible de démarrer l'appel." };
  }

  return { ok: true, data: { callId: data as string } };
}

const endSchema = z.object({
  callId: z.string().uuid(),
  status: z.enum(["ended", "missed", "rejected", "failed"]),
  reason: z.string().nullable().optional(),
});

export async function endCallSession(
  callId: string,
  status: Extract<CallStatus, "ended" | "missed" | "rejected" | "failed">,
  reason?: string | null,
): Promise<CallActionResult<null>> {
  const parsed = endSchema.safeParse({ callId, status, reason });
  if (!parsed.success) return { ok: false, error: "Paramètres invalides." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase.rpc("end_call_session", {
    p_call_id: parsed.data.callId,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason ?? undefined,
  });

  if (error) {
    console.error("[endCallSession]", error);
    return { ok: false, error: "Échec fin d'appel." };
  }

  revalidatePath("/messages");
  return { ok: true, data: null };
}

export async function markCallConnected(
  callId: string,
): Promise<CallActionResult<null>> {
  const parsed = idSchema.safeParse(callId);
  if (!parsed.success) return { ok: false, error: "ID invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase.rpc("mark_call_connected", {
    p_call_id: parsed.data,
  });

  if (error) return { ok: false, error: "Échec connexion." };
  return { ok: true, data: null };
}
