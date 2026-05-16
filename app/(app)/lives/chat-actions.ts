"use server";

/* Étape 18 — Server Actions chat live.
 *
 * sendLiveChatMessage : appelle RPC send_live_chat_message_with_rate_limit
 *  (rate-limit 1 msg / 2s atomic en DB).
 *
 * deleteLiveChatMessage : soft-delete (owner OU host). UPDATE policy RLS
 *  gère l'autorisation. */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { moderateChatMessage } from "@/lib/moderation/anthropic";
import { findBlockedKeyword } from "@/lib/moderation/keywords";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

/* Niveaux de modération chat configurables sur circle_live_rooms.auto_mod_level.
 *   off     : aucun filtre
 *   low     : keywords FR uniquement (sync, <5ms)
 *   medium  : keywords + Claude Haiku 4.5
 *   high    : keywords + Claude (seuil score >= 0.4)
 *   strict  : keywords + Claude (seuil score >= 0.2) — bloque le moindre doute
 */
type AutoModLevel = "off" | "low" | "medium" | "high" | "strict";

async function logBlock(
  supabase: SupabaseAny,
  sessionId: string,
  userId: string,
  content: string,
  blockKind: "keyword" | "ai" | "rate_limited",
  reason: string | null,
  categories: string[] | null,
  score: number | null,
) {
  try {
    await supabase.from("live_chat_moderation_blocks").insert({
      session_id: sessionId,
      user_id: userId,
      content_preview: content.slice(0, 80),
      block_kind: blockKind,
      reason,
      categories,
      score,
    });
  } catch {
    /* fire-and-forget : log d'audit non bloquant. */
  }
}

const sendSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().trim().min(1).max(400),
});

export async function sendLiveChatMessage(
  args: z.infer<typeof sendSchema>,
) {
  const parsed = sendSchema.safeParse(args);
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

  /* Lit le niveau de modération du live. */
  const { data: room } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .select("auto_mod_level")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  const level: AutoModLevel =
    (room as { auto_mod_level?: AutoModLevel } | null)?.auto_mod_level ??
    "medium";

  /* 1. Pré-check keywords FR synchrone (toujours actif sauf level=off). */
  if (level !== "off") {
    const kw = findBlockedKeyword(parsed.data.content);
    if (kw) {
      await logBlock(
        supabase,
        parsed.data.sessionId,
        user.id,
        parsed.data.content,
        "keyword",
        `mot bloqué: ${kw.matched}`,
        ["keyword"],
        1,
      );
      return {
        ok: false as const,
        error:
          "Ton message contient un terme interdit. Reformule pour le faire passer.",
      };
    }
  }

  /* 2. Claude Haiku 4.5 selon niveau (medium+). */
  if (level === "medium" || level === "high" || level === "strict") {
    const verdict = await moderateChatMessage(parsed.data.content);
    if (verdict && !verdict.allowed) {
      /* Seuil de bascule selon niveau (strict bloque même les doutes). */
      const threshold =
        level === "strict" ? 0.2 : level === "high" ? 0.4 : 0.55;
      if (verdict.score >= threshold) {
        await logBlock(
          supabase,
          parsed.data.sessionId,
          user.id,
          parsed.data.content,
          "ai",
          verdict.reason,
          verdict.categories,
          verdict.score,
        );
        return {
          ok: false as const,
          error: verdict.reason
            ? `Message bloqué par modération : ${verdict.reason}.`
            : "Message bloqué par la modération IA.",
        };
      }
    }
  }

  /* 3. Insert via RPC rate-limit. */
  const { data, error } = await (supabase as SupabaseAny).rpc(
    "send_live_chat_message_with_rate_limit",
    { p_session_id: parsed.data.sessionId, p_content: parsed.data.content },
  );

  if (error) {
    const code = String(error.message ?? "").toLowerCase();
    if (code.includes("rate_limited")) {
      await logBlock(
        supabase,
        parsed.data.sessionId,
        user.id,
        parsed.data.content,
        "rate_limited",
        "moins de 2s depuis le dernier message",
        null,
        null,
      );
    }
    const mapped =
      code.includes("rate_limited")
        ? "Doucement ! Attends 2 secondes avant ton prochain message."
        : code.includes("chat_disabled")
          ? "Le chat est désactivé sur ce live."
          : code.includes("live_not_active")
            ? "Le live n'est pas en cours."
            : code.includes("content_too_long")
              ? "Message trop long (400 caractères max)."
              : code.includes("empty_content")
                ? "Message vide."
                : `Envoi échoué : ${error.message}`;
    return { ok: false as const, error: mapped };
  }

  return { ok: true as const, id: data as string };
}

const deleteSchema = z.object({
  messageId: z.string().uuid(),
});

export async function deleteLiveChatMessage(
  args: z.infer<typeof deleteSchema>,
) {
  const parsed = deleteSchema.safeParse(args);
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
    .from("live_chat_messages")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq("id", parsed.data.messageId);

  if (error) {
    return {
      ok: false as const,
      error: `Suppression échouée : ${error.message}`,
    };
  }

  return { ok: true as const };
}
