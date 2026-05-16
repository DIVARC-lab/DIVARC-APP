import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateLiveKitToken,
  isLiveKitConfigured,
} from "@/lib/livekit/server";

/* Étape 5 — Endpoint token LiveKit généralisé pour les lives (publics
 * ou cercle). Le host obtient canPublish=true, les viewers canPublish=false.
 *
 * GET /api/lives/[sessionId]/token
 * Réponse : { token, wsUrl, canPublish, role: 'host' | 'viewer' }
 *
 * Sécurité :
 *  - Auth required
 *  - Vérifie que la session existe et n'est pas ended/cancelled
 *  - RLS sur circle_live_rooms s'applique côté DB
 *  - Visibility public/unlisted → tout user auth peut rejoindre viewer
 *  - friends_only → check accepted friendship avec host
 *  - circle → check membre actif du cercle
 *  - subscribers_only → V2 (refuse pour V1)
 *  - private → host only
 *  - Host (host_id = user.id) toujours canPublish=true */

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await ctx.params;

  if (!/^[a-f0-9-]{36}$/i.test(sessionId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  if (!isLiveKitConfigured()) {
    return NextResponse.json(
      { error: "livekit_not_configured" },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data: room } = await (supabase as any)
    .from("circle_live_rooms")
    .select(
      "id, host_id, circle_id, kind, status, visibility, age_restriction",
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (!room) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  const r = room as {
    id: string;
    host_id: string;
    circle_id: string | null;
    kind: "audio" | "video";
    status: "scheduled" | "live" | "ended" | "cancelled";
    visibility: string;
  };

  if (r.status === "ended" || r.status === "cancelled") {
    return NextResponse.json({ error: "session_closed" }, { status: 410 });
  }

  const isHost = r.host_id === user.id;
  let canJoin = isHost;
  if (!canJoin) {
    switch (r.visibility) {
      case "public":
      case "unlisted":
        canJoin = true;
        break;
      case "friends_only": {
        const { data: friend } = await supabase
          .from("friendships")
          .select("status")
          .eq("status", "accepted")
          .or(
            `and(requester_id.eq.${user.id},recipient_id.eq.${r.host_id}),and(recipient_id.eq.${user.id},requester_id.eq.${r.host_id})`,
          )
          .maybeSingle();
        canJoin = Boolean(friend);
        break;
      }
      case "circle": {
        if (!r.circle_id) {
          canJoin = false;
          break;
        }
        const { data: member } = await supabase
          .from("circle_members")
          .select("status")
          .eq("circle_id", r.circle_id)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        canJoin = Boolean(member);
        break;
      }
      case "subscribers_only": {
        /* Étape 15 — Check abonnement actif vers le host via RPC
           SECURITY DEFINER has_active_creator_subscription. */
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const { data: hasSub } = await (supabase as any).rpc(
          "has_active_creator_subscription",
          { p_creator_id: r.host_id },
        );
        canJoin = hasSub === true;
        break;
      }
      case "private":
      default:
        canJoin = false;
        break;
    }
  }

  if (!canJoin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  /* Display name */
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", user.id)
    .maybeSingle();
  const displayName =
    (profile as { full_name?: string | null } | null)?.full_name ??
    (profile as { username?: string | null } | null)?.username ??
    "Membre";

  const token = await generateLiveKitToken({
    roomId: r.id,
    userId: user.id,
    displayName,
    /* Host = peut publier. Viewer = canPublish false (LiveKit refusera
       les tentatives de pub côté serveur). */
    canPublish: isHost,
  });

  if (!token) {
    return NextResponse.json(
      { error: "token_generation_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    token,
    wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    canPublish: isHost,
    role: isHost ? ("host" as const) : ("viewer" as const),
  });
}
