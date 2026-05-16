import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateLiveKitToken,
  isLiveKitConfigured,
} from "@/lib/livekit/server";

/* Sprint E (LiveKit) — Endpoint qui retourne un access token JWT pour
 * rejoindre une room circle_live_rooms.
 *
 * GET /api/circles/live/[roomId]/token
 *   - Vérifie auth user
 *   - Vérifie que la room existe, n'est pas ended et que l'user est
 *     membre actif du cercle propriétaire
 *   - Génère un token LiveKit signé (identity = userId)
 *   - Réponse : { token: string; wsUrl: string; canPublish: boolean }
 *
 * canPublish = true pour V1 (tout le monde peut prendre la parole).
 * V2 : raise-hand côté audio room, restriction côté video room. */

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await ctx.params;
  if (!/^[a-f0-9-]{36}$/i.test(roomId)) {
    return NextResponse.json({ error: "invalid_room_id" }, { status: 400 });
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
    .select("id, circle_id, status, kind")
    .eq("id", roomId)
    .maybeSingle();
  if (!room) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }

  const r = room as {
    id: string;
    circle_id: string;
    status: "scheduled" | "live" | "ended" | "cancelled";
  };
  if (r.status === "ended" || r.status === "cancelled") {
    return NextResponse.json({ error: "room_closed" }, { status: 410 });
  }

  /* Membre actif du cercle ? RLS bloquerait sinon. */
  const { data: member } = await supabase
    .from("circle_members")
    .select("status")
    .eq("circle_id", r.circle_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "not_a_member" }, { status: 403 });
  }

  /* Profile pour le display name. */
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", user.id)
    .maybeSingle();
  const displayName =
    (profile as { full_name?: string | null; username?: string | null } | null)
      ?.full_name ??
    (profile as { username?: string | null } | null)?.username ??
    "Membre";

  const token = await generateLiveKitToken({
    roomId: r.id,
    userId: user.id,
    displayName,
    canPublish: true,
  });

  if (!token) {
    return NextResponse.json({ error: "token_generation_failed" }, { status: 500 });
  }

  return NextResponse.json({
    token,
    wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    canPublish: true,
  });
}
