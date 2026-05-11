"use client";

/* useCallSession — Provider + hook qui orchestre les appels WebRTC.
 *
 * Responsabilités :
 *   - Écouter l'inbox channel pour les incoming calls
 *   - Gérer la state machine locale (idle → ringing → connecting → in-call)
 *   - Acquérir le micro, créer la PeerConnection, exchange SDP/ICE
 *   - Exposer startCall / acceptCall / rejectCall / hangup
 *   - Cleaner les ressources à la fin (close PC, stop tracks)
 *
 * Mount : <CallProvider> dans le app layout. */

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
import { sendRing, subscribeCallChannel, subscribeInbox } from "@/lib/calls/signaling";
import {
  type CallKind,
  type LocalCallState,
  type SignalingMessage,
  RING_TIMEOUT_MS,
} from "@/lib/calls/types";
import { createWebRTCClient, type WebRTCClient } from "@/lib/calls/webrtc";

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

  /* Refs pour les ressources mutables non-React. */
  const webrtcRef = useRef<WebRTCClient | null>(null);
  const callChannelRef = useRef<ReturnType<typeof subscribeCallChannel> | null>(
    null,
  );
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* ICE candidates reçus AVANT que la PC ne soit prête → buffer. */
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);

  /* Cleanup helper : ferme tout. */
  const teardown = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    callChannelRef.current?.unsubscribe();
    callChannelRef.current = null;
    webrtcRef.current?.close();
    webrtcRef.current = null;
    pendingIceRef.current = [];
    setRemoteStream(null);
    setIsMuted(false);
  }, []);

  /* Handler des messages signaling reçus du peer. */
  const handleSignal = useCallback(async (msg: SignalingMessage) => {
    const webrtc = webrtcRef.current;
    if (!webrtc) return;

    try {
      if (msg.type === "offer") {
        const answer = await webrtc.applyOffer(msg.sdp);
        /* Flush les ICE candidates bufferisés. */
        for (const ice of pendingIceRef.current) {
          await webrtc.addIceCandidate(ice);
        }
        pendingIceRef.current = [];
        await callChannelRef.current?.send({
          type: "answer",
          sdp: answer,
          from: currentUserId!,
        });
      } else if (msg.type === "answer") {
        await webrtc.applyAnswer(msg.sdp);
        for (const ice of pendingIceRef.current) {
          await webrtc.addIceCandidate(ice);
        }
        pendingIceRef.current = [];
      } else if (msg.type === "ice") {
        /* Si la remoteDescription n'est pas encore set, on buffer. */
        if (webrtc.pc.remoteDescription) {
          await webrtc.addIceCandidate(msg.candidate);
        } else {
          pendingIceRef.current.push(msg.candidate);
        }
      } else if (msg.type === "hangup") {
        toast("Appel terminé.");
        await endCurrentCall("ended", msg.reason ?? "peer hangup");
      } else if (msg.type === "reject") {
        toast("Appel refusé.");
        await endCurrentCall("rejected", "peer rejected");
      }
    } catch (err) {
      console.error("[call:signal]", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  /* Fin propre d'un appel (côté local) : RPC + teardown. */
  const endCurrentCall = useCallback(
    async (
      status: "ended" | "missed" | "rejected" | "failed",
      reason?: string,
    ) => {
      const current = state;
      if (current.kind === "idle") return;
      await endCallSession(current.callId, status, reason);
      teardown();
      setState({ kind: "idle" });
    },
    [state, teardown],
  );

  /* Inbox : écoute les incoming calls. */
  useEffect(() => {
    if (!currentUserId) return;
    const { unsubscribe } = subscribeInbox(currentUserId, (payload) => {
      /* Ignore si on est déjà dans un appel (le caller verra timeout). */
      setState((prev) => {
        if (prev.kind !== "idle") return prev;
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

  /* Une fois en "ringing-inbound", on subscribe au channel de l'appel
     pour pouvoir recevoir le offer dès qu'il arrive. */
  useEffect(() => {
    if (!currentUserId) return;
    if (state.kind !== "ringing-inbound") return;
    const { unsubscribe, send } = subscribeCallChannel(
      state.callId,
      currentUserId,
      handleSignal,
    );
    callChannelRef.current = { unsubscribe, send, channel: null as never };
    return () => {
      /* Si on quitte cet état sans avoir établi de WebRTC, on garde le
         channel pour permettre l'accept. Le teardown final ferme tout. */
    };
  }, [state.kind, state.kind === "ringing-inbound" ? state.callId : null, currentUserId, handleSignal]);

  /* startCall : caller side. */
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
      if (!currentUserId) {
        toast.error("Tu dois être connecté.");
        return;
      }
      if (state.kind !== "idle") {
        toast.error("Tu es déjà dans un appel.");
        return;
      }

      /* 1. Crée la session DB. */
      const created = await createCallSession(conversationId, kind);
      if (!created.ok) {
        toast.error(created.error);
        return;
      }
      const { callId } = created.data;

      /* 2. Permission micro + WebRTC. */
      let webrtc: WebRTCClient;
      try {
        webrtc = await createWebRTCClient({
          onIceCandidate: async (candidate) => {
            await callChannelRef.current?.send({
              type: "ice",
              candidate,
              from: currentUserId,
            });
          },
          onRemoteTrack: (stream) => {
            setRemoteStream(stream);
          },
          onConnectionState: async (cs) => {
            if (cs === "connected") {
              await markCallConnected(callId);
              setState((prev) =>
                prev.kind === "connecting" || prev.kind === "ringing-outbound"
                  ? {
                      kind: "in-call",
                      callId: prev.callId,
                      conversationId: prev.conversationId,
                      peerId: prev.peerId,
                      startedAt: prev.startedAt,
                      connectedAt: Date.now(),
                    }
                  : prev,
              );
            } else if (cs === "failed" || cs === "disconnected") {
              await endCurrentCall("failed", "ICE/conn failed");
            }
          },
        });
      } catch (err) {
        console.error("[startCall:getUserMedia]", err);
        await endCallSession(callId, "failed", "no microphone");
        toast.error("Impossible d'accéder au micro.");
        return;
      }
      webrtcRef.current = webrtc;

      /* 3. Subscribe au channel de l'appel. */
      const ch = subscribeCallChannel(callId, currentUserId, handleSignal);
      callChannelRef.current = ch;

      /* 4. Notifie le callee via son inbox. */
      await sendRing(peerId, {
        callId,
        conversationId,
        callerId: currentUserId,
        kind,
      });

      /* 5. Crée et envoie l'offer SDP. */
      const offer = await webrtc.createOffer();
      await ch.send({ type: "offer", sdp: offer, from: currentUserId });

      setState({
        kind: "ringing-outbound",
        callId,
        conversationId,
        peerId,
        startedAt: Date.now(),
      });

      /* Ring timeout : si pas de réponse dans 35s → missed. On lit le
         state via setState callback pour éviter une fermeture stale. */
      ringTimeoutRef.current = setTimeout(() => {
        setState((cur) => {
          if (
            cur.kind === "ringing-outbound" ||
            cur.kind === "connecting"
          ) {
            void endCallSession(cur.callId, "missed", "no answer");
            teardown();
            return { kind: "idle" };
          }
          return cur;
        });
      }, RING_TIMEOUT_MS);
    },
    [currentUserId, state.kind, handleSignal, endCurrentCall, teardown],
  );

  /* acceptCall : callee side. */
  const acceptCall = useCallback(async () => {
    if (!currentUserId) return;
    if (state.kind !== "ringing-inbound") return;

    try {
      const webrtc = await createWebRTCClient({
        onIceCandidate: async (candidate) => {
          await callChannelRef.current?.send({
            type: "ice",
            candidate,
            from: currentUserId,
          });
        },
        onRemoteTrack: (stream) => {
          setRemoteStream(stream);
        },
        onConnectionState: async (cs) => {
          if (cs === "connected") {
            await markCallConnected(state.callId);
            setState((prev) =>
              prev.kind === "connecting" || prev.kind === "ringing-inbound"
                ? {
                    kind: "in-call",
                    callId: prev.callId,
                    conversationId: prev.conversationId,
                    peerId: prev.peerId,
                    startedAt: prev.startedAt,
                    connectedAt: Date.now(),
                  }
                : prev,
            );
          } else if (cs === "failed" || cs === "disconnected") {
            await endCurrentCall("failed", "ICE/conn failed");
          }
        },
      });
      webrtcRef.current = webrtc;
      setState((prev) =>
        prev.kind === "ringing-inbound"
          ? {
              kind: "connecting",
              callId: prev.callId,
              conversationId: prev.conversationId,
              peerId: prev.peerId,
              startedAt: prev.startedAt,
            }
          : prev,
      );
    } catch (err) {
      console.error("[acceptCall:getUserMedia]", err);
      await endCurrentCall("failed", "no microphone");
      toast.error("Impossible d'accéder au micro.");
    }
  }, [currentUserId, state, endCurrentCall]);

  /* rejectCall : callee refuse l'incoming. */
  const rejectCall = useCallback(async () => {
    if (!currentUserId) return;
    if (state.kind !== "ringing-inbound") return;
    await callChannelRef.current?.send({
      type: "reject",
      from: currentUserId,
    });
    await endCurrentCall("rejected", "user rejected");
  }, [currentUserId, state, endCurrentCall]);

  /* hangup : termine l'appel en cours. */
  const hangup = useCallback(
    async (reason?: string) => {
      if (state.kind === "idle") return;
      if (currentUserId) {
        await callChannelRef.current?.send({
          type: "hangup",
          reason,
          from: currentUserId,
        });
      }
      await endCurrentCall("ended", reason);
    },
    [state.kind, currentUserId, endCurrentCall],
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      webrtcRef.current?.setMuted(next);
      return next;
    });
  }, []);

  /* Cleanup au unmount. */
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

/* Helper pour récupérer le profil peer côté UI (lookup minimal). */
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
