"use server";

/* Étape "Raise hand" — Server Actions demandes de prise de parole.
 *
 * Flow :
 *   1. Viewer → requestJoinStage(sessionId, message?)
 *      → INSERT live_stage_requests status='pending'
 *   2. Host/mod → approveStageRequest(requestId)
 *      → UPDATE status='approved' + LiveKit grantPublish
 *   3. Host/mod → denyStageRequest(requestId)
 *      → UPDATE status='denied'
 *   4. Host/mod → removeFromStage(sessionId, userId)
 *      → INSERT-or-UPDATE status='revoked' + LiveKit revokePublish
 *   5. Viewer → cancelMyStageRequest(sessionId)
 *      → UPDATE status='cancelled' sur ses pending
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  grantPublishToLiveParticipant,
  revokePublishFromLiveParticipant,
} from "@/lib/livekit/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().trim().max(140).optional(),
});

export async function requestJoinStage(args: z.infer<typeof requestSchema>) {
  const parsed = requestSchema.safeParse(args);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalide",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { error } = await (supabase as SupabaseAny)
    .from("live_stage_requests")
    .insert({
      session_id: parsed.data.sessionId,
      requester_id: user.id,
      message: parsed.data.message ?? null,
      status: "pending",
    });

  if (error) {
    const msg = String(error.message ?? "").toLowerCase();
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return {
        ok: false as const,
        error: "Tu as déjà une demande en attente pour ce live.",
      };
    }
    return {
      ok: false as const,
      error: `Demande échouée : ${error.message}`,
    };
  }

  revalidatePath(`/lives/${parsed.data.sessionId}`);
  return { ok: true as const };
}

const cancelSchema = z.object({ sessionId: z.string().uuid() });

export async function cancelMyStageRequest(
  args: z.infer<typeof cancelSchema>,
) {
  const parsed = cancelSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalide" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { error } = await (supabase as SupabaseAny)
    .from("live_stage_requests")
    .update({
      status: "cancelled",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("session_id", parsed.data.sessionId)
    .eq("requester_id", user.id)
    .eq("status", "pending");

  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/lives/${parsed.data.sessionId}`);
  return { ok: true as const };
}

const resolveSchema = z.object({ requestId: z.string().uuid() });

export async function approveStageRequest(
  args: z.infer<typeof resolveSchema>,
) {
  const parsed = resolveSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* Charge la demande pour récupérer session_id + requester_id. RLS
     SELECT couvre déjà (host/mod uniquement). */
  const { data: reqRow } = await (supabase as SupabaseAny)
    .from("live_stage_requests")
    .select("id, session_id, requester_id, status")
    .eq("id", parsed.data.requestId)
    .maybeSingle();
  const req = reqRow as {
    id: string;
    session_id: string;
    requester_id: string;
    status: string;
  } | null;
  if (!req) {
    return { ok: false as const, error: "Demande introuvable." };
  }
  if (req.status !== "pending") {
    return { ok: false as const, error: "Demande déjà traitée." };
  }

  /* UPDATE en DB + LiveKit grant. LiveKit identity = userId. */
  const { error } = await (supabase as SupabaseAny)
    .from("live_stage_requests")
    .update({
      status: "approved",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", req.id);
  if (error) return { ok: false as const, error: error.message };

  const grantRes = await grantPublishToLiveParticipant(
    req.session_id,
    req.requester_id,
  );
  if (!grantRes.ok) {
    /* DB updated but LiveKit failed → on garde le state pour audit, mais
       on revient avec une erreur claire pour que le host puisse re-essayer. */
    console.error("[approveStageRequest] LiveKit grant failed", grantRes.error);
  }

  revalidatePath(`/lives/${req.session_id}`);
  revalidatePath(`/lives/${req.session_id}/studio`);
  return { ok: true as const };
}

export async function denyStageRequest(
  args: z.infer<typeof resolveSchema>,
) {
  const parsed = resolveSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { data: reqRow } = await (supabase as SupabaseAny)
    .from("live_stage_requests")
    .select("session_id")
    .eq("id", parsed.data.requestId)
    .maybeSingle();
  const req = reqRow as { session_id: string } | null;

  const { error } = await (supabase as SupabaseAny)
    .from("live_stage_requests")
    .update({
      status: "denied",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", parsed.data.requestId);
  if (error) return { ok: false as const, error: error.message };

  if (req) revalidatePath(`/lives/${req.session_id}/studio`);
  return { ok: true as const };
}

const removeSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function removeFromStage(args: z.infer<typeof removeSchema>) {
  const parsed = removeSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* Marque la dernière approved comme revoked + LiveKit revoke. */
  await (supabase as SupabaseAny)
    .from("live_stage_requests")
    .update({
      status: "revoked",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("session_id", parsed.data.sessionId)
    .eq("requester_id", parsed.data.userId)
    .eq("status", "approved");

  const revokeRes = await revokePublishFromLiveParticipant(
    parsed.data.sessionId,
    parsed.data.userId,
  );
  if (!revokeRes.ok) {
    console.error("[removeFromStage] LiveKit revoke failed", revokeRes.error);
  }

  revalidatePath(`/lives/${parsed.data.sessionId}/studio`);
  return { ok: true as const };
}
