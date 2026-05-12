import { NextResponse } from "next/server";
import { sendPushToUsers } from "@/lib/push/sender";
import { createClient } from "@/lib/supabase/server";

/* /api/push/diagnostic — endpoint de debug qui retourne en JSON l'état
 * de chaque maillon de la chaîne Web Push :
 *  - VAPID keys présentes côté env
 *  - L'user a au moins 1 push_subscription enregistrée
 *  - La RPC get_push_subs_for_users (migration 0081) existe
 *  - Tentative d'envoi d'un push test via sendPushToUsers
 *
 * Appel : navigateur → /api/push/diagnostic (GET). Affiche JSON brut. */

export async function GET() {
  const checks: Record<string, unknown> = {};

  /* 1. VAPID env vars */
  checks.vapid = {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: !!process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT ?? "(default mailto:contact@divarc.app)",
  };
  const vapidOk =
    !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    !!process.env.VAPID_PRIVATE_KEY;
  if (!vapidOk) {
    checks.summary = "❌ VAPID keys missing. Configure NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY in Vercel env vars.";
    return NextResponse.json(checks);
  }

  const supabase = await createClient();

  /* 2. User auth */
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    checks.auth = "❌ Pas authentifié";
    return NextResponse.json(checks, { status: 401 });
  }
  checks.user_id = user.id;

  /* 3. User's own push_subscriptions (RLS OK pour self) */
  const { data: ownSubs, error: ownSubsErr } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, created_at, last_success_at")
    .eq("user_id", user.id);
  checks.own_subscriptions = {
    count: ownSubs?.length ?? 0,
    error: ownSubsErr?.message ?? null,
    subs: ownSubs?.map((s) => ({
      id: s.id,
      endpoint_preview: s.endpoint.slice(0, 60) + "...",
      created_at: s.created_at,
      last_success_at: s.last_success_at,
    })),
  };

  /* 4. RPC get_push_subs_for_users (migration 0081) */
  const { data: rpcSubs, error: rpcErr } = await supabase.rpc(
    "get_push_subs_for_users",
    { p_user_ids: [user.id] },
  );
  if (rpcErr) {
    checks.rpc_0081 = {
      status: "❌ RPC error",
      error: rpcErr.message,
      hint:
        rpcErr.code === "42883"
          ? "La RPC n'existe pas. Exécute la migration 0081_push_subs_for_messaging.sql"
          : rpcErr.code,
    };
  } else {
    checks.rpc_0081 = {
      status: "✅ RPC OK",
      returned_count: (rpcSubs as unknown[])?.length ?? 0,
    };
  }

  /* 5. Tentative d'envoi d'un push test via sendPushToUsers */
  if ((ownSubs?.length ?? 0) > 0) {
    const sendResult = await sendPushToUsers([user.id], {
      title: "🧪 Diagnostic DIVARC",
      body: "Si tu vois ce push, la chaîne Web Push fonctionne !",
      url: "/messages",
      tag: "divarc-diagnostic",
    });
    checks.send_test = {
      delivered: sendResult.delivered,
      failed: sendResult.failed,
      removed_stale: sendResult.removedStale,
    };
    if (sendResult.delivered > 0) {
      checks.summary = "✅ Push fonctionne ! Tu devrais avoir reçu une notif test.";
    } else if (sendResult.failed > 0) {
      checks.summary = "⚠️ Push envoyé au service mais échec (subscription expirée ?). Réactive le toggle dans /settings/notifications";
    } else if (sendResult.removedStale > 0) {
      checks.summary = "⚠️ Subscription stale (gone). Réactive le toggle dans /settings/notifications";
    } else {
      checks.summary = "⚠️ Aucun push délivré — vérifie les logs Vercel";
    }
  } else {
    checks.summary = "❌ Aucune push_subscription pour cet user. Active le toggle dans /settings/notifications";
  }

  return NextResponse.json(checks);
}
