import "server-only";

/* Sprint I — Delivery webhook DIVARC vers endpoint externe.
 *
 * Architecture :
 *  1. Fetch le webhook actif du cercle (RLS bypass via admin client).
 *  2. Vérifie que l'event est dans events_subscribed.
 *  3. POST JSON signé HMAC-SHA256 (header X-DIVARC-Signature: sha256=...).
 *  4. Met à jour last_delivery_at, last_delivery_status, failed_count.
 *
 * Best-effort : fire-and-forget côté caller (Server Action), pas de
 * retry sophistiqué V1. Timeout 5s. */

import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";

export type CircleWebhookEvent =
  | "post.created"
  | "post.deleted"
  | "member.joined"
  | "member.left"
  | "report.opened";

export type WebhookPayload = {
  event: CircleWebhookEvent;
  circle_id: string;
  occurred_at: string;
  data: Record<string, unknown>;
};

const FETCH_TIMEOUT_MS = 5000;

export async function deliverCircleWebhook(payload: WebhookPayload): Promise<void> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    /* Service role pas configuré → on skip silencieusement. */
    return;
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data: webhook } = await (admin as any)
    .from("circle_webhooks")
    .select("id, url, secret, events_subscribed, is_active, failed_count")
    .eq("circle_id", payload.circle_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!webhook) return;
  const w = webhook as {
    id: string;
    url: string;
    secret: string;
    events_subscribed: string[];
    is_active: boolean;
    failed_count: number;
  };

  if (!w.events_subscribed?.includes(payload.event)) return;

  /* Désactivation auto après 10 fails consécutifs (anti-loop). */
  if (w.failed_count >= 10) return;

  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", w.secret)
    .update(body)
    .digest("hex");

  let status: number | null = null;
  let ok = false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(w.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-DIVARC-Signature": `sha256=${signature}`,
        "X-DIVARC-Event": payload.event,
        "X-DIVARC-Webhook-Id": w.id,
        "User-Agent": "DIVARC-Webhook/1.0",
      },
      body,
      signal: controller.signal,
    });
    status = response.status;
    ok = response.ok;
  } catch (err) {
    console.error("[deliverCircleWebhook] fetch failed:", err);
  } finally {
    clearTimeout(timeout);
  }

  /* Best-effort update de l'état de delivery. */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  await (admin as any)
    .from("circle_webhooks")
    .update({
      last_delivery_at: new Date().toISOString(),
      last_delivery_status: status,
      failed_count: ok ? 0 : w.failed_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", w.id);
}
