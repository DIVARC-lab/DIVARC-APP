"use client";

/* lib/calls/signaling.ts — couche signaling sur Supabase Realtime.
 *
 * Architecture :
 *   1. Inbox (incoming calls) : postgres_changes INSERT sur call_sessions
 *      filtré par callee_id=user. 100% fiable (le RPC create_call_session
 *      insère la row → la notif déclenche le ring côté callee).
 *   2. Per-call signaling : broadcast channel `call:<callId>` pour
 *      l'échange offer/answer/ICE/accepted/hangup/reject entre peers.
 *
 * Le broadcast V1 est "best effort" mais comme les deux peers sont déjà
 * subscribed via flow connu (callee subscribe au moment du ring INSERT,
 * caller au moment du RPC), il n'y a pas de race. */

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { CallKind, CallRow, SignalingMessage } from "./types";

export type InboundRingPayload = {
  callId: string;
  conversationId: string;
  callerId: string;
  kind: CallKind;
};

/* Inbox : listen INSERT sur call_sessions où callee_id = me.
 * Triggered immédiatement par la RPC create_call_session du caller. */
export function subscribeInbox(
  userId: string,
  onRing: (payload: InboundRingPayload) => void,
  onStatus?: (status: string) => void,
): { channel: RealtimeChannel; unsubscribe: () => void } {
  const supabase = createClient();
  /* Sans filter au niveau Realtime → RLS protège quand même (seul le
     callee voit les rows où callee_id = me). On filtre côté client en
     plus pour double-safety. Évite les pbs de filter syntax côté
     Realtime server. */
  const channel = supabase
    .channel(`inbox-calls:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "call_sessions",
      },
      (payload) => {
        console.log("[inbox] INSERT received", payload);
        const row = payload.new as CallRow;
        if (row.callee_id !== userId) return; // client filter
        if (row.status !== "ringing") return;
        onRing({
          callId: row.id,
          conversationId: row.conversation_id,
          callerId: row.caller_id,
          kind: row.kind,
        });
      },
    )
    .subscribe((status, err) => {
      console.log("[inbox] subscribe status:", status, err);
      onStatus?.(status);
    });

  return {
    channel,
    unsubscribe: () => {
      void supabase.removeChannel(channel);
    },
  };
}

/* Channel per-call : signaling broadcast. */
export function subscribeCallChannel(
  callId: string,
  myUserId: string,
  onMessage: (msg: SignalingMessage) => void,
): {
  channel: RealtimeChannel;
  send: (msg: SignalingMessage) => Promise<void>;
  unsubscribe: () => void;
  /* Promise qui résout quand le channel est SUBSCRIBED. À await avant
     de pouvoir envoyer fiablement. */
  ready: Promise<void>;
} {
  const supabase = createClient();
  const channel = supabase.channel(`call:${callId}`, {
    config: { broadcast: { self: false } },
  });

  channel.on("broadcast", { event: "signal" }, ({ payload }) => {
    const msg = payload as SignalingMessage;
    if (msg.from === myUserId) return;
    onMessage(msg);
  });

  /* Promise de readiness — résout sur SUBSCRIBED OU après 5s timeout
     (fallback de sécurité au cas où le callback Realtime ne fire jamais).
     Reject sur erreur explicite uniquement. */
  const ready = new Promise<void>((resolve, reject) => {
    let settled = false;
    const settle = (action: () => void) => {
      if (settled) return;
      settled = true;
      action();
    };
    channel.subscribe((status) => {
      console.log("[call:channel]", callId.slice(0, 8), status);
      if (status === "SUBSCRIBED") settle(resolve);
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        settle(() => reject(new Error(`Call channel ${status}`)));
      }
    });
    /* Filet de sécurité : on resolve quand même après 5s — si le
       channel n'est pas vraiment subscribed, les send() échoueront
       côté handleSignal mais au moins l'UI ne se bloque pas. */
    setTimeout(() => settle(resolve), 5000);
  });

  return {
    channel,
    send: async (msg) => {
      /* Attend que le channel soit prêt avant d'envoyer. Si déjà prêt,
         resolve immédiat. */
      await ready;
      await channel.send({
        type: "broadcast",
        event: "signal",
        payload: msg,
      });
    },
    unsubscribe: () => {
      void supabase.removeChannel(channel);
    },
    ready,
  };
}
