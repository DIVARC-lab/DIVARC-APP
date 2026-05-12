import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type AdminOrServerClient = SupabaseClient<Database>;

/* Configuration VAPID — clés à générer une fois via :
 *   npx web-push generate-vapid-keys
 * Puis ajouter dans .env.local + Vercel :
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY=BKxxx...
 *   VAPID_PRIVATE_KEY=xxx...
 *   VAPID_SUBJECT=mailto:contact@divarc.app
 *
 * Le subject doit être un mailto: ou https:// pour identifier l'origine
 * des push (requis par le protocole). */
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:contact@divarc.app";

/* Normalise une clé base64 vers URL-safe base64 sans padding (format
 * exigé par web-push). Strip "=" en fin + remplace "+"/"/" par "-"/"_". */
function urlSafeBase64(key: string): string {
  return key.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

let vapidConfigured = false;
function ensureVapidConfigured() {
  if (vapidConfigured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  try {
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      urlSafeBase64(VAPID_PUBLIC_KEY),
      urlSafeBase64(VAPID_PRIVATE_KEY),
    );
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.error("[VAPID] setVapidDetails failed:", err);
    return false;
  }
}

export type PushPayload = {
  title: string;
  body?: string;
  /* URL à ouvrir au tap sur la notification. */
  url?: string;
  /* Tag pour grouper / remplacer les notifications similaires (Android). */
  tag?: string;
  /* Icône (PWA icon par défaut). */
  icon?: string;
  /* Badge (Android). */
  badge?: string;
};

export type PushDeliveryResult = {
  delivered: number;
  failed: number;
  removedStale: number;
};

/* Variante batch : envoie le même push à N users en une seule RPC pour
 * récupérer leurs subs (bypass RLS via SECURITY DEFINER, cf migration
 * 0081). Utilisée par notifyNewMessage / notifyIncomingCall où le
 * caller ne peut pas lire les subs des destinataires en direct (RLS
 * push_subscriptions_select_owner les restreint à self).
 *
 * Sécurité : c'est au caller de valider qu'il est autorisé à notifier
 * ces user_ids (typiquement : membre de la conv concernée). */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<PushDeliveryResult> {
  const result: PushDeliveryResult = {
    delivered: 0,
    failed: 0,
    removedStale: 0,
  };
  if (!ensureVapidConfigured()) {
    console.warn("[sendPushToUsers] VAPID not configured — no-op");
    return result;
  }
  if (userIds.length === 0) return result;

  const supabase = await createClient();
  const { data: subs, error } = await supabase.rpc(
    "get_push_subs_for_users",
    { p_user_ids: userIds },
  );
  if (error) {
    console.error("[sendPushToUsers] RPC failed:", error.message);
    return result;
  }
  const rows = (subs ?? []) as Array<{
    id: string;
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>;
  if (rows.length === 0) return result;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    url: payload.url ?? "/",
    tag: payload.tag,
    icon: payload.icon ?? "/icon-192.png",
    badge: payload.badge ?? "/icon-192.png",
  });

  const now = new Date().toISOString();

  await Promise.all(
    rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 * 24 },
        );
        result.delivered++;
        await supabase
          .from("push_subscriptions")
          .update({ last_success_at: now })
          .eq("id", sub.id);
      } catch (err) {
        const status =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode: number }).statusCode
            : null;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          result.removedStale++;
        } else {
          result.failed++;
          console.error("[sendPushToUsers] push failed:", err);
        }
      }
    }),
  );

  return result;
}

/* Envoie une notification push à toutes les subscriptions d'un user. Si
 * un endpoint renvoie 404/410 (gone), on supprime la subscription du store
 * (le browser/device a désinstallé l'app ou révoqué la perm).
 *
 * Cette fonction est sûre à appeler depuis n'importe quelle server action :
 * - aucun throw si VAPID n'est pas configuré (no-op silencieux)
 * - aucun throw si l'utilisateur n'a pas de subscription active
 * - les erreurs réseau sont catchées par push individuel */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  /* Client optionnel — par défaut server client (RLS scoped à l'utilisateur
     courant). Pour les cron jobs/webhooks, passer le admin client pour
     bypasser RLS. */
  client?: AdminOrServerClient,
): Promise<PushDeliveryResult> {
  const result: PushDeliveryResult = {
    delivered: 0,
    failed: 0,
    removedStale: 0,
  };

  if (!ensureVapidConfigured()) return result;

  const supabase = client ?? (await createClient());
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return result;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    url: payload.url ?? "/",
    tag: payload.tag,
    icon: payload.icon ?? "/icon-192.png",
    badge: payload.badge ?? "/icon-192.png",
  });

  const now = new Date().toISOString();

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 * 24 }, // 24h max retention
        );
        result.delivered++;
        /* On met à jour last_success_at en best-effort (non-bloquant si
           ça échoue). */
        await supabase
          .from("push_subscriptions")
          .update({ last_success_at: now })
          .eq("id", sub.id);
      } catch (error) {
        const status =
          error && typeof error === "object" && "statusCode" in error
            ? (error as { statusCode: number }).statusCode
            : null;
        /* 404 / 410 = endpoint mort → on supprime la subscription. */
        if (status === 404 || status === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
          result.removedStale++;
        } else {
          result.failed++;
        }
      }
    }),
  );

  return result;
}
