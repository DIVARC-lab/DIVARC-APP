"use client";

/* CallOverlay — UI fullscreen pour les 4 phases d'un appel :
 *   - ringing-outbound : "Appel en cours…" + bouton Hangup
 *   - ringing-inbound : "<peer> t'appelle" + boutons Accept/Reject
 *   - connecting : "Connexion…" + bouton Hangup
 *   - in-call : durée + bouton Mute + Hangup
 *
 * L'audio distant est routé sur un <audio autoplay> caché. */

import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useCallSession, fetchPeerProfile } from "@/lib/hooks/useCallSession";

export function CallOverlay() {
  const { state, remoteStream, isMuted, acceptCall, rejectCall, hangup, toggleMute } =
    useCallSession();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [peerProfile, setPeerProfile] = useState<{
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  /* Branche le stream distant sur l'audio element. */
  useEffect(() => {
    const node = audioRef.current;
    if (!node) return;
    if (remoteStream) {
      node.srcObject = remoteStream;
      void node.play().catch(() => {
        /* iOS Safari peut bloquer si pas d'interaction — on log et
           continue, le user aura à toucher l'écran. */
      });
    } else {
      node.srcObject = null;
    }
  }, [remoteStream]);

  /* Fetch peer profile quand un appel démarre. */
  useEffect(() => {
    if (state.kind === "idle") {
      setPeerProfile(null);
      return;
    }
    let cancelled = false;
    fetchPeerProfile(state.peerId).then((p) => {
      if (!cancelled) setPeerProfile(p);
    });
    return () => {
      cancelled = true;
    };
  }, [state.kind, state.kind === "idle" ? null : state.peerId]);

  /* Timer pendant l'appel. */
  useEffect(() => {
    if (state.kind !== "in-call") {
      setElapsedSec(0);
      return;
    }
    const connectedAt = state.connectedAt;
    const tick = () => {
      setElapsedSec(Math.floor((Date.now() - connectedAt) / 1000));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [state.kind, state.kind === "in-call" ? state.connectedAt : null]);

  if (state.kind === "idle") return null;

  const displayName =
    peerProfile?.full_name ??
    peerProfile?.username ??
    "Inconnu";
  const subtitle =
    state.kind === "ringing-outbound"
      ? "Appel en cours…"
      : state.kind === "ringing-inbound"
        ? "Appel entrant"
        : state.kind === "connecting"
          ? "Connexion…"
          : formatDuration(elapsedSec);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Appel"
      className="fixed inset-0 z-[70] flex flex-col items-center justify-between bg-gradient-to-b from-night via-night-soft to-night text-cream py-12 px-6"
    >
      <audio ref={audioRef} autoPlay className="sr-only" />

      <div className="flex flex-col items-center gap-5 mt-8">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-cream/60">
          {state.kind === "ringing-inbound"
            ? "Appel audio entrant"
            : "Appel audio"}
        </p>
        <div className="ring-4 ring-cream/15 rounded-full">
          <Avatar
            src={peerProfile?.avatar_url ?? null}
            fullName={displayName}
            size="xl"
            className="!w-32 !h-32"
          />
        </div>
        <div className="text-center">
          <h2 className="font-display italic text-4xl leading-tight">
            {displayName}
          </h2>
          {peerProfile?.username ? (
            <p className="text-cream/60 text-sm mt-1">
              @{peerProfile.username}
            </p>
          ) : null}
        </div>
        <p
          className={`text-sm font-semibold tracking-wide tabular-nums ${
            state.kind === "in-call" ? "text-gold" : "text-cream/80 animate-pulse"
          }`}
        >
          {subtitle}
        </p>
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-md mb-4">
        {state.kind === "ringing-inbound" ? (
          <div className="flex items-center justify-around">
            <button
              type="button"
              onClick={() => void rejectCall()}
              aria-label="Refuser"
              className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <span className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg">
                <PhoneOff className="w-6 h-6" aria-hidden />
              </span>
              <span className="text-xs font-semibold">Refuser</span>
            </button>
            <button
              type="button"
              onClick={() => void acceptCall()}
              aria-label="Décrocher"
              className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <span className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg animate-pulse">
                <Phone className="w-6 h-6" aria-hidden />
              </span>
              <span className="text-xs font-semibold">Décrocher</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-around">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? "Réactiver le micro" : "Couper le micro"}
              className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <span
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isMuted
                    ? "bg-red-500/20 text-red-300 border-2 border-red-400/40"
                    : "bg-white/10 hover:bg-white/15 border-2 border-white/10"
                }`}
              >
                {isMuted ? (
                  <MicOff className="w-5 h-5" aria-hidden />
                ) : (
                  <Mic className="w-5 h-5" aria-hidden />
                )}
              </span>
              <span className="text-[11px] font-semibold">
                {isMuted ? "Muet" : "Micro"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => void hangup("user hangup")}
              aria-label="Raccrocher"
              className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <span className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg">
                <PhoneOff className="w-6 h-6" aria-hidden />
              </span>
              <span className="text-xs font-semibold">Raccrocher</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
