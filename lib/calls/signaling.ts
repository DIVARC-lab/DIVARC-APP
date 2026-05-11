"use client";

/* lib/calls/signaling.ts — couche signaling sur Supabase Realtime.
 *
 * Deux types de channels :
 *   1. User inbox : `user-calls:<userId>` — listen pour incoming calls
 *      (broadcast envoyé par le caller au moment du create_call_session)
 *   2. Per-call : `call:<callId>` — exchange offer/answer/ICE/hangup
 *      entre les 2 peers
 *
 * Les payloads sont des SignalingMessage typés (cf types.ts). */

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { CallKind, SignalingMessage } from "./types";

export type InboundRingPayload = {
  callId: string;
  conversationId: string;
  callerId: string;
  kind: CallKind;
};

/* Channel inbox : un seul par user, ouvert au login.
 * Le caller envoie un broadcast "ring" → le callee reçoit l'invitation. */
export function subscribeInbox(
  userId: string,
  onRing: (payload: InboundRingPayload) => void,
): { channel: RealtimeChannel; unsubscribe: () => void } {
  const supabase = createClient();
  const channel = supabase.channel(`user-calls:${userId}`, {
    config: { broadcast: { self: false } },
  });
  channel.on("broadcast", { event: "ring" }, ({ payload }) => {
    if (payload && typeof payload === "object") {
      onRing(payload as InboundRingPayload);
    }
  });
  channel.subscribe();
  return {
    channel,
    unsubscribe: () => {
      void supabase.removeChannel(channel);
    },
  };
}

/* Envoie un broadcast "ring" à l'inbox du callee.
 * Note : le caller doit créer son propre channel temporaire pour push
 * (les broadcasts cross-channels ne sont pas autorisés sans config). */
export async function sendRing(
  calleeUserId: string,
  payload: InboundRingPayload,
): Promise<void> {
  const supabase = createClient();
  const channel = supabase.channel(`user-calls:${calleeUserId}`);
  channel.subscribe();
  /* Attendre que le channel soit ready avant de push. */
  await new Promise<void>((resolve) => {
    const onState = (status: string) => {
      if (status === "SUBSCRIBED") {
        resolve();
      }
    };
    channel.subscribe(onState);
    /* Garde-fou : si le subscribe ne callback pas (déjà subscribed),
       resolve quand même après 500ms. */
    setTimeout(resolve, 500);
  });
  await channel.send({
    type: "broadcast",
    event: "ring",
    payload,
  });
  void supabase.removeChannel(channel);
}

/* Channel per-call : SDP + ICE + hangup. */
export function subscribeCallChannel(
  callId: string,
  myUserId: string,
  onMessage: (msg: SignalingMessage) => void,
): {
  channel: RealtimeChannel;
  send: (msg: SignalingMessage) => Promise<void>;
  unsubscribe: () => void;
} {
  const supabase = createClient();
  const channel = supabase.channel(`call:${callId}`, {
    config: { broadcast: { self: false } },
  });

  channel.on("broadcast", { event: "signal" }, ({ payload }) => {
    const msg = payload as SignalingMessage;
    if (msg.from === myUserId) return; // sécurité — ignore self
    onMessage(msg);
  });
  channel.subscribe();

  return {
    channel,
    send: async (msg) => {
      await channel.send({
        type: "broadcast",
        event: "signal",
        payload: msg,
      });
    },
    unsubscribe: () => {
      void supabase.removeChannel(channel);
    },
  };
}
