import { NextResponse } from "next/server";
import { getVapidStatus, sendPushToUsers } from "@/lib/push/sender";
import { createClient } from "@/lib/supabase/server";

/* /api/push/diagnostic — endpoint de debug qui retourne en JSON l'état
 * de chaque maillon de la chaîne Web Push. */

export async function GET() {
  const checks: Record<string, unknown> = {};

  try {
    /* 1. VAPID env vars */
    const hasPublic = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const hasPrivate = !!process.env.VAPID_PRIVATE_KEY;
    checks.vapid = {
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: hasPublic,
      VAPID_PRIVATE_KEY: hasPrivate,
      VAPID_SUBJECT:
        process.env.VAPID_SUBJECT ??
        "(default mailto:contact@divarc.app)",
      ...getVapidStatus(),
    };
    if (!hasPublic || !hasPrivate) {
      checks.summary =
        "❌ VAPID keys missing. Configure NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY in Vercel env vars.";
      return NextResponse.json(checks);
    }

    /* 2. Supabase client + auth */
    let supabase;
    try {
      supabase = await createClient();
    } catch (err) {
      checks.summary = "❌ createClient failed";
      checks.error = err instanceof Error ? err.message : String(err);
      return NextResponse.json(checks);
    }

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr) {
      checks.auth = `❌ ${authErr.message}`;
      return NextResponse.json(checks, { status: 401 });
    }
    if (!user) {
      checks.summary =
        "❌ Pas authentifié. Connecte-toi sur le site puis re-essaie cette URL dans le MÊME navigateur.";
      return NextResponse.json(checks, { status: 401 });
    }
    checks.user_id = user.id;

    /* 3. Subs personnelles (RLS OK pour self) */
    try {
      const { data: ownSubs, error: ownSubsErr } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, created_at, last_success_at")
        .eq("user_id", user.id);
      checks.own_subscriptions = {
        count: ownSubs?.length ?? 0,
        error: ownSubsErr?.message ?? null,
        subs:
          ownSubs?.map((s) => ({
            id: s.id,
            endpoint_preview: s.endpoint.slice(0, 60) + "...",
            created_at: s.created_at,
            last_success_at: s.last_success_at,
          })) ?? [],
      };
    } catch (err) {
      checks.own_subscriptions = {
        error: err instanceof Error ? err.message : String(err),
      };
    }

    /* 4. RPC migration 0081 */
    try {
      const { data: rpcSubs, error: rpcErr } = await supabase.rpc(
        "get_push_subs_for_users",
        { p_user_ids: [user.id] },
      );
      if (rpcErr) {
        checks.rpc_0081 = {
          status: "❌ RPC error",
          error: rpcErr.message,
          code: rpcErr.code,
          hint:
            rpcErr.code === "42883"
              ? "La RPC n'existe pas. Exécute la migration 0081_push_subs_for_messaging.sql dans Supabase SQL Editor"
              : null,
        };
      } else {
        const arr = (rpcSubs as unknown as unknown[]) ?? [];
        checks.rpc_0081 = {
          status: "✅ RPC OK",
          returned_count: arr.length,
        };
      }
    } catch (err) {
      checks.rpc_0081 = {
        status: "❌ RPC threw",
        error: err instanceof Error ? err.message : String(err),
      };
    }

    /* 5. Tentative d'envoi via sendPushToUsers */
    const ownCount =
      (checks.own_subscriptions as { count?: number })?.count ?? 0;
    if (ownCount > 0) {
      try {
        const sendResult = await sendPushToUsers([user.id], {
          title: "🧪 Diagnostic DIVARC",
          body: "Si tu vois ce push, la chaîne Web Push fonctionne !",
          url: "/messages",
          tag: "divarc-diagnostic",
        });
        checks.send_test = sendResult;
        if (sendResult.delivered > 0) {
          checks.summary =
            "✅ Push fonctionne ! Tu devrais avoir reçu une notif test.";
        } else if (sendResult.failed > 0) {
          checks.summary =
            "⚠️ Push envoyé au service mais échec. Réactive le toggle dans /settings/notifications";
        } else if (sendResult.removedStale > 0) {
          checks.summary =
            "⚠️ Subscription stale. Réactive le toggle dans /settings/notifications";
        } else {
          checks.summary =
            "⚠️ Aucun push délivré — RPC probablement manquante (migration 0081)";
        }
      } catch (err) {
        checks.send_test = {
          error: err instanceof Error ? err.message : String(err),
        };
        checks.summary =
          "❌ sendPushToUsers threw — check les logs Vercel pour le stack trace";
      }
    } else {
      checks.summary =
        "❌ Aucune push_subscription pour cet user. Active le toggle dans /settings/notifications";
    }

    return NextResponse.json(checks);
  } catch (err) {
    /* Catch-all : surface l'erreur réelle en JSON plutôt que 500 opaque. */
    return NextResponse.json(
      {
        summary: "❌ Crash inattendu dans /api/push/diagnostic",
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : null,
        checks_so_far: checks,
      },
      { status: 500 },
    );
  }
}
