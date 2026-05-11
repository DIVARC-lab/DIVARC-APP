"use client";

/* useCallSession — Provider + hook qui orchestre les appels WebRTC.
 *
 * Flow caller (handshake) :
 *   1. RPC create_call_session → callId
 *   2. getUserMedia + create PeerConnection
 *   3. Subscribe call channel (await SUBSCRIBED)
 *   4. State: ringing-outbound, attente du "accepted" du callee
 *   5. Callee envoie "accepted" → caller createOffer + send offer
 *   6. Callee envoie answer → applyAnswer
 *   7. ICE flow en parallèle
 *   8. connectionState === "connected" → in-call + mark_call_connected
 *
 * Flow callee :
 *   1. postgres_changes INSERT call_sessions → state ringing-inbound +
 *      subscribe call channel
 *   2. User clique Accept → getUserMedia + create PC + send "accepted"
 *   3. Reçoit offer → applyOffer → createAnswer → send answer
 *   4. ICE flow + connected → in-call + mark_call_connected */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  createCallSession,
  endCallSession,
  markCallConnected,
} from "@/app/(app)/messages/call-actions";
import { createClient } from "@/lib/supabase/client";
import { subscribeCallChannel, subscribeInbox } from "@/lib/calls/signaling";
import {
  type CallKind,
  type LocalCallState,
  type SignalingMessage,
  RING_TIMEOUT_MS,
} from "@/lib/calls/types";
import { createWebRTCClient, type WebRTCClient } from "@/lib/calls/webrtc";

type CallChannel = ReturnType<typeof subscribeCallChannel>;

type CallContextValue = {
  state: LocalCallState;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  startCall: (params: {
    conversationId: string;
    peerId: string;
    kind?: CallKind;
  }) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  hangup: (reason?: string) => Promise<void>;
  toggleMute: () => void;
};

const CallContext = createContext<CallContextValue | null>(null);

export function useCallSession(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallSession must be used within CallProvider");
  return ctx;
}

export function CallProvider({
  currentUserId,
  children,
}: {
  currentUserId: string | null;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<LocalCallState>({ kind: "idle" });
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  /* Refs mutables (non-React). */
  const webrtcRef = useRef<WebRTCClient | null>(null);
  const callChannelRef = useRef<CallChannel | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  /* Côté caller : on attend que le callee envoie "accepted" avant de
     créer l'offer. Stocké en ref pour ne pas re-render. */
  const calleeAcceptedRef = useRef(false);

  const log = (...args: unknown[]) => {
    if (typeof window !== "undefined") {
      console.log("[call]", ...args);
    }
  };

  /* Cleanup. */
  const teardown = useCallback(() => {
    log("teardown");
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    callChannelRef.current?.unsubscribe();
    callChannelRef.current = null;
    webrtcRef.current?.close();
    webrtcRef.current = null;
    pendingIceRef.current = [];
    calleeAcceptedRef.current = false;
    setRemoteStream(null);
    setIsMuted(false);
  }, []);

  const endCall = useCallback(
    async (
      status: "ended" | "missed" | "rejected" | "failed",
      reason?: string,
    ) => {
      log("endCall", status, reason);
      setState((cur) => {
        if (cur.kind === "idle") return cur;
        void endCallSession(cur.callId, status, reason);
        return { kind: "idle" };
      });
      teardown();
    },
    [teardown],
  );

  /* Caller : envoie l'offer (déclenché par "accepted" du callee). */
  const sendOfferAsCaller = useCallback(async () => {
    const webrtc = webrtcRef.current;
    const ch = callChannelRef.current;
    if (!webrtc || !ch || !currentUserId) return;
    if (calleeAcceptedRef.current) return; // already done
    calleeAcceptedRef.current = true;
    try {
      log("caller: createOffer");
      const offer = await webrtc.createOffer();
      await ch.send({ type: "offer", sdp: offer, from: currentUserId });
      log("caller: offer sent");
      setState((cur) =>
        cur.kind === "ringing-outbound"
          ? {
              kind: "connecting",
              callId: cur.callId,
              conversationId: cur.conversationId,
              peerId: cur.peerId,
              startedAt: cur.startedAt,
            }
          : cur,
      );
    } catch (err) {
      console.error("[call] sendOfferAsCaller failed", err);
      toast.error("Échec création offer.");
      await endCall("failed", "offer creation failed");
    }
  }, [currentUserId, endCall]);

  /* Handler des messages signaling. */
  const handleSignal = useCallback(
    async (msg: SignalingMessage) => {
      log("signal:in", msg.type);
      const webrtc = webrtcRef.current;
      const ch = callChannelRef.current;
      if (!ch || !currentUserId) return;

      try {
        if (msg.type === "accepted") {
          /* Caller reçoit l'accept → envoie l'offer. */
          await sendOfferAsCaller();
        } else if (msg.type === "offer") {
          if (!webrtc) {
            log("signal: offer received but no webrtc yet, ignoring");
            return;
          }
          const answer = await webrtc.applyOffer(msg.sdp);
          for (const ice of pendingIceRef.current) {
            await webrtc.addIceCandidate(ice);
          }
          pendingIceRef.current = [];
          await ch.send({
            type: "answer",
            sdp: answer,
            from: currentUserId,
          });
          log("callee: answer sent");
        } else if (msg.type === "answer") {
          if (!webrtc) return;
          await webrtc.applyAnswer(msg.sdp);
          for (const ice of pendingIceRef.current) {
            await webrtc.addIceCandidate(ice);
          }
          pendingIceRef.current = [];
          log("caller: answer applied");
        } else if (msg.type === "ice") {
          if (webrtc && webrtc.pc.remoteDescription) {
            await webrtc.addIceCandidate(msg.candidate);
          } else {
            pendingIceRef.current.push(msg.candidate);
          }
        } else if (msg.type === "hangup") {
          toast("Appel terminé par l'autre personne.");
          await endCall("ended", msg.reason ?? "peer hangup");
        } else if (msg.type === "reject") {
          toast("Appel refusé.");
          await endCall("rejected", "peer rejected");
        }
      } catch (err) {
        console.error("[call:signal:err]", err);
      }
    },
    [currentUserId, sendOfferAsCaller, endCall],
  );

  /* Inbox : postgres_changes INSERT sur call_sessions. */
  useEffect(() => {
    if (!currentUserId) return;
    log("inbox: subscribe", currentUserId);
    const { unsubscribe } = subscribeInbox(currentUserId, (payload) => {
      log("inbox: incoming ring", payload);
      setState((prev) => {
        if (prev.kind !== "idle") {
          log("inbox: already in call, ignoring");
          return prev;
        }
        return {
          kind: "ringing-inbound",
          callId: payload.callId,
          conversationId: payload.conversationId,
          peerId: payload.callerId,
          startedAt: Date.now(),
        };
      });
    });
    return unsubscribe;
  }, [currentUserId]);

  /* Côté callee : subscribe au call channel dès qu'on est en
     ringing-inbound, pour pouvoir recevoir l'offer après accept. */
  const incomingCallId =
    state.kind === "ringing-inbound" ? state.callId : null;
  useEffect(() => {
    if (!incomingCallId || !currentUserId) return;
    log("callee: subscribe call channel", incomingCallId);
    const ch = subscribeCallChannel(
      incomingCallId,
      currentUserId,
      handleSignal,
    );
    callChannelRef.current = ch;
    return () => {
      /* Cleanup géré par teardown() à la fin de l'appel. */
    };
  }, [incomingCallId, currentUserId, handleSignal]);

  /* === startCall (caller side) === */
  const startCall = useCallback(
    async ({
      conversationId,
      peerId,
      kind = "audio",
    }: {
      conversationId: string;
      peerId: string;
      kind?: CallKind;
    }) => {
      log("startCall", { conversationId, peerId, kind });
      if (!currentUserId) {
        toast.error("Tu dois être connecté.");
        return;
      }
      if (state.kind !== "idle") {
        toast.error("Tu es déjà dans un appel.");
        return;
      }

      /* 1. Permission micro. Fait en premier pour échouer vite si
         l'user refuse — pas la peine de créer une session DB. */
      let webrtc: WebRTCClient;
      try {
        webrtc = await createWebRTCClient({
          onIceCandidate: async (candidate) => {
            log("caller: local ICE");
            await callChannelRef.current?.send({
              type: "ice",
              candidate,
              from: currentUserId,
            });
          },
          onRemoteTrack: (stream) => {
            log("caller: remote track");
            setRemoteStream(stream);
          },
          onConnectionState: async (cs) => {
            log("caller: connection state", cs);
            if (cs === "connected") {
              setState((cur) => {
                if (cur.kind === "connecting" || cur.kind === "ringing-outbound") {
                  void markCallConnected(cur.callId);
                  return {
                    kind: "in-call",
                    callId: cur.callId,
                    conversationId: cur.conversationId,
                    peerId: cur.peerId,
                    startedAt: cur.startedAt,
                    connectedAt: Date.now(),
                  };
                }
                return cur;
              });
            } else if (cs === "failed" || cs === "disconnected") {
              await endCall("failed", `connection ${cs}`);
            }
          },
        });
      } catch (err) {
        console.error("[startCall:getUserMedia]", err);
        toast.error(
          err instanceof Error
            ? `Micro indisponible : ${err.message}`
            : "Micro indisponible.",
        );
        return;
      }
      webrtcRef.current = webrtc;

      /* 2. Crée la session DB → INSERT déclenche postgres_changes côté
         callee, qui passe en ringing-inbound. */
      const created = await createCallSession(conversationId, kind);
      if (!created.ok) {
        toast.error(created.error);
        teardown();
        return;
      }
      const { callId } = created.data;
      log("startCall: created", callId);

      /* 3. Subscribe au call channel ET passe immédiatement en
         ringing-outbound (overlay visible, mic actif, micro mute disponible).
         On NE bloque PAS l'UI sur ch.ready — la promise se résout en
         arrière-plan ou timeout en 5s, et send() await ready en interne. */
      const ch = subscribeCallChannel(callId, currentUserId, handleSignal);
      callChannelRef.current = ch;

      setState({
        kind: "ringing-outbound",
        callId,
        conversationId,
        peerId,
        startedAt: Date.now(),
      });
      log("caller: ringing-outbound, waiting for accept");

      /* Log async la readiness (juste pour debug, pas de blocking). */
      ch.ready
        .then(() => log("caller: channel ready"))
        .catch((err) => {
          console.error("[startCall:channel]", err);
          toast.error("Channel Realtime indisponible.");
        });

      /* 5. Timeout : si pas d'answer dans 35s → missed. */
      ringTimeoutRef.current = setTimeout(() => {
        setState((cur) => {
          if (
            cur.kind === "ringing-outbound" ||
            cur.kind === "connecting"
          ) {
            log("caller: ring timeout, missed");
            toast("Pas de réponse.");
            void endCallSession(cur.callId, "missed", "no answer");
            teardown();
            return { kind: "idle" };
          }
          return cur;
        });
      }, RING_TIMEOUT_MS);
    },
    [currentUserId, state.kind, handleSignal, endCall, teardown],
  );

  /* === acceptCall (callee side) === */
  const acceptCall = useCallback(async () => {
    if (!currentUserId) return;
    if (state.kind !== "ringing-inbound") return;
    log("acceptCall");
    const { callId } = state;

    let webrtc: WebRTCClient;
    try {
      webrtc = await createWebRTCClient({
        onIceCandidate: async (candidate) => {
          log("callee: local ICE");
          await callChannelRef.current?.send({
            type: "ice",
            candidate,
            from: currentUserId,
          });
        },
        onRemoteTrack: (stream) => {
          log("callee: remote track");
          setRemoteStream(stream);
        },
        onConnectionState: async (cs) => {
          log("callee: connection state", cs);
          if (cs === "connected") {
            setState((cur) => {
              if (
                cur.kind === "connecting" ||
                cur.kind === "ringing-inbound"
              ) {
                void markCallConnected(cur.callId);
                return {
                  kind: "in-call",
                  callId: cur.callId,
                  conversationId: cur.conversationId,
                  peerId: cur.peerId,
                  startedAt: cur.startedAt,
                  connectedAt: Date.now(),
                };
              }
              return cur;
            });
          } else if (cs === "failed" || cs === "disconnected") {
            await endCall("failed", `connection ${cs}`);
          }
        },
      });
    } catch (err) {
      console.error("[acceptCall:getUserMedia]", err);
      toast.error(
        err instanceof Error
          ? `Micro indisponible : ${err.message}`
          : "Micro indisponible.",
      );
      await endCall("failed", "no microphone");
      return;
    }
    webrtcRef.current = webrtc;

    /* Le channel est déjà subscribed via le useEffect ringing-inbound.
       Envoie "accepted" → le caller crée et envoie l'offer. */
    await callChannelRef.current?.send({
      type: "accepted",
      from: currentUserId,
    });
    log("callee: accepted sent");

    setState((cur) =>
      cur.kind === "ringing-inbound"
        ? {
            kind: "connecting",
            callId: cur.callId,
            conversationId: cur.conversationId,
            peerId: cur.peerId,
            startedAt: cur.startedAt,
          }
        : cur,
    );
  }, [currentUserId, state, endCall]);

  const rejectCall = useCallback(async () => {
    if (!currentUserId || state.kind !== "ringing-inbound") return;
    log("rejectCall");
    await callChannelRef.current?.send({
      type: "reject",
      from: currentUserId,
    });
    await endCall("rejected", "user rejected");
  }, [currentUserId, state, endCall]);

  const hangup = useCallback(
    async (reason?: string) => {
      if (state.kind === "idle") return;
      log("hangup", reason);
      if (currentUserId) {
        await callChannelRef.current?.send({
          type: "hangup",
          reason,
          from: currentUserId,
        });
      }
      await endCall("ended", reason);
    },
    [state.kind, currentUserId, endCall],
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      webrtcRef.current?.setMuted(next);
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      teardown();
    };
  }, [teardown]);

  const value = useMemo<CallContextValue>(
    () => ({
      state,
      remoteStream,
      isMuted,
      startCall,
      acceptCall,
      rejectCall,
      hangup,
      toggleMute,
    }),
    [state, remoteStream, isMuted, startCall, acceptCall, rejectCall, hangup, toggleMute],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export async function fetchPeerProfile(peerId: string): Promise<{
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
} | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, username, avatar_url")
    .eq("id", peerId)
    .maybeSingle();
  return data ?? null;
}
