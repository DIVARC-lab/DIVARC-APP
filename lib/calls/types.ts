/* Types partagés du module calls.
 *
 * Architecture V1 (Chantier 2) :
 *   - WebRTC P2P 1:1 audio
 *   - Signaling via Supabase Realtime (broadcast channel par call)
 *   - STUN public Google (pas de TURN V1)
 *   - State machine côté client, source de vérité dans call_sessions DB */

export type CallKind = "audio" | "video";

export type CallStatus =
  | "ringing"
  | "connecting"
  | "in_progress"
  | "ended"
  | "missed"
  | "rejected"
  | "failed";

export type CallRow = {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  kind: CallKind;
  status: CallStatus;
  started_at: string;
  connected_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
  end_reason: string | null;
};

/* Messages échangés sur le channel de signaling. */
export type SignalingMessage =
  | { type: "offer"; sdp: RTCSessionDescriptionInit; from: string }
  | { type: "answer"; sdp: RTCSessionDescriptionInit; from: string }
  | { type: "ice"; candidate: RTCIceCandidateInit; from: string }
  | { type: "hangup"; reason?: string; from: string }
  | { type: "reject"; from: string };

/* État local côté client pendant un appel. */
export type LocalCallState =
  | { kind: "idle" }
  | {
      kind: "ringing-outbound";
      callId: string;
      conversationId: string;
      peerId: string;
      startedAt: number;
    }
  | {
      kind: "ringing-inbound";
      callId: string;
      conversationId: string;
      peerId: string;
      startedAt: number;
    }
  | {
      kind: "connecting";
      callId: string;
      conversationId: string;
      peerId: string;
      startedAt: number;
    }
  | {
      kind: "in-call";
      callId: string;
      conversationId: string;
      peerId: string;
      startedAt: number;
      connectedAt: number;
    };

export const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/* Délai au-delà duquel un appel non décroché passe en "missed". */
export const RING_TIMEOUT_MS = 35_000;
