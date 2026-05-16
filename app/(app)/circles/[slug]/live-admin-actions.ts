"use server";

/* Sprint E (LiveKit) — Server Actions admin pour les salles live.
 *
 * Toutes ces actions exigent que l'user appelant soit
 * owner/admin/moderator du cercle ET que la salle existe dans ce cercle. */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  kickFromLiveRoom,
  muteParticipantTrackInLiveRoom,
} from "@/lib/livekit/admin";

const kickSchema = z.object({
  roomId: z.string().uuid(),
  participantIdentity: z.string().uuid(),
});

const muteSchema = z.object({
  roomId: z.string().uuid(),
  participantIdentity: z.string().uuid(),
  trackSid: z.string().min(3),
});

async function assertModeratorOfRoom(
  roomId: string,
  userId: string,
): Promise<{ ok: true; circleId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data: room } = await (supabase as any)
    .from("circle_live_rooms")
    .select("circle_id, host_id")
    .eq("id", roomId)
    .maybeSingle();
  if (!room) return { ok: false, error: "Salle introuvable." };

  const r = room as { circle_id: string; host_id: string };

  /* Host de la salle = autorité immédiate. */
  if (r.host_id === userId) return { ok: true, circleId: r.circle_id };

  /* Sinon vérifie role cercle. */
  const { data: member } = await supabase
    .from("circle_members")
    .select("role")
    .eq("circle_id", r.circle_id)
    .eq("user_id", userId)
    .maybeSingle();
  const role = (member as { role?: string } | null)?.role ?? null;
  if (
    role === "owner" ||
    role === "admin" ||
    role === "moderator" ||
    role === "mod"
  ) {
    return { ok: true, circleId: r.circle_id };
  }
  return { ok: false, error: "Réservé aux modérateurs." };
}

export async function liveKickParticipant(
  args: z.infer<typeof kickSchema>,
) {
  const parsed = kickSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const allow = await assertModeratorOfRoom(parsed.data.roomId, user.id);
  if (!allow.ok) return { ok: false as const, error: allow.error };

  if (parsed.data.participantIdentity === user.id) {
    return {
      ok: false as const,
      error: "Tu ne peux pas t'exclure toi-même — utilise le bouton Quitter.",
    };
  }

  return await kickFromLiveRoom(
    parsed.data.roomId,
    parsed.data.participantIdentity,
  );
}

export async function liveMuteParticipantTrack(
  args: z.infer<typeof muteSchema>,
) {
  const parsed = muteSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const allow = await assertModeratorOfRoom(parsed.data.roomId, user.id);
  if (!allow.ok) return { ok: false as const, error: allow.error };

  return await muteParticipantTrackInLiveRoom(
    parsed.data.roomId,
    parsed.data.participantIdentity,
    parsed.data.trackSid,
  );
}
