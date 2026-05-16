import "server-only";

/* Sprint E (LiveKit) — Helpers admin pour modérer les salles live.
 *
 * Utilise RoomServiceClient (livekit-server-sdk) pour :
 *  - removeParticipant : kicker un participant
 *  - mutePublishedTrack : couper le micro d'un participant
 *  - updateParticipant : changer permissions (canPublish toggle)
 *
 * Auth : ces fonctions doivent être appelées depuis des Server Actions
 * qui vérifient au préalable que l'user est admin/owner du cercle.
 */

import { RoomServiceClient } from "livekit-server-sdk";

function getRoomService(): RoomServiceClient | null {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !wsUrl) return null;
  /* RoomServiceClient utilise HTTP, pas WSS. On convertit. */
  const httpUrl = wsUrl.replace(/^wss?:/, "https:");
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
}

export async function kickFromLiveRoom(
  roomId: string,
  participantIdentity: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const svc = getRoomService();
  if (!svc) return { ok: false, error: "LiveKit non configuré." };
  try {
    await svc.removeParticipant(roomId, participantIdentity);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Échec exclusion.",
    };
  }
}

export async function muteParticipantTrackInLiveRoom(
  roomId: string,
  participantIdentity: string,
  trackSid: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const svc = getRoomService();
  if (!svc) return { ok: false, error: "LiveKit non configuré." };
  try {
    await svc.mutePublishedTrack(
      roomId,
      participantIdentity,
      trackSid,
      true,
    );
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Échec mute.",
    };
  }
}

export async function listLiveRoomParticipants(
  roomId: string,
): Promise<
  | {
      ok: true;
      participants: Array<{
        identity: string;
        name: string;
        joined_at: number;
        tracks: Array<{ sid: string; source: number; muted: boolean }>;
      }>;
    }
  | { ok: false; error: string }
> {
  const svc = getRoomService();
  if (!svc) return { ok: false, error: "LiveKit non configuré." };
  try {
    const list = await svc.listParticipants(roomId);
    return {
      ok: true,
      participants: list.map((p) => ({
        identity: p.identity,
        name: p.name,
        joined_at: Number(p.joinedAt),
        tracks: p.tracks.map((t) => ({
          sid: t.sid,
          source: t.source as unknown as number,
          muted: t.muted,
        })),
      })),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Échec listing.",
    };
  }
}
