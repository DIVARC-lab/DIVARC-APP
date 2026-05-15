"use client";

/* CallOverlay — UI fullscreen pour les 4 phases d'un appel (audio + vidéo) :
 *   - ringing-outbound : "Appel en cours…" + bouton Hangup
 *   - ringing-inbound : "<peer> t'appelle" + boutons Accept/Reject
 *   - connecting : "Connexion…" + bouton Hangup
 *   - in-call : durée + contrôles
 *
 * Audio call :
 *   - Avatar peer en grand + sonnerie + boutons mute/hangup
 *   - Audio distant routé sur un <audio autoplay> caché
 *
 * Vidéo call (in-call) :
 *   - Vidéo distante en grand (cover plein écran)
 *   - Preview locale en mini-tile (coin haut-droit, miroir, draggable
 *     pas nécessaire en V1)
 *   - Contrôles flottants au-dessus : mute audio, mute video, switch
 *     camera (mobile), hangup
 *   - Pendant ringing/connecting : avatar peer + preview locale en
 *     fond (montre que la caméra est bien active) */

import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  SwitchCamera,
  Video,
  VideoOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useCallSession, fetchPeerProfile } from "@/lib/hooks/useCallSession";
import { cn } from "@/lib/utils/cn";

export function CallOverlay() {
  const {
    state,
    callKind,
    remoteStream,
    localStream,
    isMuted,
    isVideoMuted,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleVideo,
    switchCamera,
  } = useCallSession();
  const audioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [peerProfile, setPeerProfile] = useState<{
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const isVideoCall = callKind === "video";

  /* Branche le stream distant sur l'élément média approprié :
     - audio call : <audio> caché (audio uniquement)
     - vidéo call : <video> visible (audio + video tracks) */
  useEffect(() => {
    const audioEl = audioRef.current;
    const videoEl = remoteVideoRef.current;
    if (isVideoCall) {
      /* En vidéo, l'<audio> caché reste vide ; on route TOUT sur <video> */
      if (audioEl) audioEl.srcObject = null;
      if (videoEl) {
        if (remoteStream) {
          videoEl.srcObject = remoteStream;
          void videoEl.play().catch(() => {
            /* iOS Safari peut bloquer si pas d'interaction — l'user
               aura à toucher l'écran. */
          });
        } else {
          videoEl.srcObject = null;
        }
      }
    } else {
      if (videoEl) videoEl.srcObject = null;
      if (audioEl) {
        if (remoteStream) {
          audioEl.srcObject = remoteStream;
          void audioEl.play().catch(() => {});
        } else {
          audioEl.srcObject = null;
        }
      }
    }
  }, [remoteStream, isVideoCall]);

  /* Preview locale (vidéo only). Branche localStream sur <video> muted
     (on n'écoute pas son propre audio). */
  useEffect(() => {
    const el = localVideoRef.current;
    if (!el || !isVideoCall) return;
    if (localStream) {
      el.srcObject = localStream;
      void el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [localStream, isVideoCall]);

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
    peerProfile?.full_name ?? peerProfile?.username ?? "Inconnu";
  const subtitle =
    state.kind === "ringing-outbound"
      ? "Appel en cours…"
      : state.kind === "ringing-inbound"
        ? "Appel entrant"
        : state.kind === "connecting"
          ? "Connexion…"
          : formatDuration(elapsedSec);

  /* === LAYOUT VIDÉO === */
  if (isVideoCall) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Appel vidéo"
        className="fixed inset-0 z-[70] bg-night text-cream overflow-hidden"
        style={{
          /* Respect safe-area iOS PWA (notch + home indicator). */
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Audio caché (inutilisé en vidéo mais on garde pour symétrie) */}
        <audio ref={audioRef} autoPlay className="sr-only" />

        {/* Vidéo distante — plein écran cover */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          /* `muted={false}` car on veut entendre le peer. */
          className={cn(
            "absolute inset-0 w-full h-full object-cover bg-night-soft transition-opacity",
            state.kind === "in-call" && remoteStream ? "opacity-100" : "opacity-0",
          )}
        />

        {/* Fallback avant in-call : avatar + nom centrés sur fond sombre */}
        {(state.kind !== "in-call" || !remoteStream) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-cream/60">
              {state.kind === "ringing-inbound"
                ? "Appel vidéo entrant"
                : "Appel vidéo"}
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
              className={cn(
                "text-sm font-semibold tracking-wide tabular-nums",
                state.kind === "ringing-outbound" || state.kind === "connecting"
                  ? "text-cream/80 animate-pulse"
                  : "text-cream/80",
              )}
            >
              {subtitle}
            </p>
          </div>
        )}

        {/* Preview locale — mini tile haut-droit. Mirroir pour caméra
            front. Cachée pendant ringing-inbound (pas encore accepté). */}
        {localStream && state.kind !== "ringing-inbound" ? (
          <div
            className={cn(
              "absolute top-4 right-4 w-28 h-40 sm:w-32 sm:h-44 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20",
              "bg-black",
            )}
            style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "w-full h-full object-cover",
                /* Miroir uniquement pour caméra front (user-facing). */
                "scale-x-[-1]",
                isVideoMuted ? "opacity-0" : "opacity-100",
              )}
            />
            {isVideoMuted ? (
              <div className="absolute inset-0 flex items-center justify-center bg-night/80">
                <VideoOff className="w-6 h-6 text-cream/60" aria-hidden />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Header info pendant l'appel (durée + nom petit). */}
        {state.kind === "in-call" && remoteStream ? (
          <div
            className="absolute left-4 right-4 flex items-center gap-3 px-4 py-2 rounded-full bg-night/40 backdrop-blur-md w-fit"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
          >
            <span className="font-semibold text-sm">{displayName}</span>
            <span className="text-cream/60 text-xs tabular-nums">
              {formatDuration(elapsedSec)}
            </span>
          </div>
        ) : null}

        {/* Contrôles en bas — flottants au-dessus de la vidéo. */}
        <div
          className="absolute left-0 right-0 px-6 pb-6"
          style={{ bottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {state.kind === "ringing-inbound" ? (
            <div className="flex items-center justify-around max-w-md mx-auto">
              <RingingActionButton
                onClick={() => void rejectCall()}
                label="Refuser"
                Icon={PhoneOff}
                color="red"
              />
              <RingingActionButton
                onClick={() => void acceptCall()}
                label="Décrocher"
                Icon={Video}
                color="emerald"
                animated
              />
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
              <ControlButton
                onClick={toggleMute}
                active={!isMuted}
                label={isMuted ? "Réactiver micro" : "Couper micro"}
                Icon={isMuted ? MicOff : Mic}
                activeColor="white"
                inactiveLabel="Muet"
              />
              <ControlButton
                onClick={toggleVideo}
                active={!isVideoMuted}
                label={
                  isVideoMuted ? "Réactiver caméra" : "Désactiver caméra"
                }
                Icon={isVideoMuted ? VideoOff : Video}
                activeColor="white"
                inactiveLabel="Off"
              />
              <ControlButton
                onClick={() => void switchCamera()}
                active
                label="Basculer caméra"
                Icon={SwitchCamera}
                activeColor="white"
                /* Cachée si pas en in-call (pas encore de stream à switch). */
                hidden={state.kind !== "in-call"}
              />
              <button
                type="button"
                onClick={() => void hangup("user hangup")}
                aria-label="Raccrocher"
                className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
              >
                <span className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg">
                  <PhoneOff className="w-6 h-6" aria-hidden />
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* === LAYOUT AUDIO === */
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Appel audio"
      className="fixed inset-0 z-[70] flex flex-col items-center justify-between bg-gradient-to-b from-night via-night-soft to-night text-cream py-12 px-6"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 48px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 48px)",
      }}
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
          className={cn(
            "text-sm font-semibold tracking-wide tabular-nums",
            state.kind === "in-call"
              ? "text-gold"
              : "text-cream/80 animate-pulse",
          )}
        >
          {subtitle}
        </p>
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-md mb-4">
        {state.kind === "ringing-inbound" ? (
          <div className="flex items-center justify-around">
            <RingingActionButton
              onClick={() => void rejectCall()}
              label="Refuser"
              Icon={PhoneOff}
              color="red"
            />
            <RingingActionButton
              onClick={() => void acceptCall()}
              label="Décrocher"
              Icon={Phone}
              color="emerald"
              animated
            />
          </div>
        ) : (
          <div className="flex items-center justify-around">
            <ControlButton
              onClick={toggleMute}
              active={!isMuted}
              label={isMuted ? "Réactiver le micro" : "Couper le micro"}
              Icon={isMuted ? MicOff : Mic}
              activeColor="white"
              inactiveLabel={isMuted ? "Muet" : "Micro"}
            />
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

/* === Sous-composants UI === */

type IconType = typeof Mic;

function RingingActionButton({
  onClick,
  label,
  Icon,
  color,
  animated = false,
}: {
  onClick: () => void;
  label: string;
  Icon: IconType;
  color: "red" | "emerald";
  animated?: boolean;
}) {
  const bg =
    color === "red"
      ? "bg-red-500 hover:bg-red-600"
      : "bg-emerald-500 hover:bg-emerald-600";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
    >
      <span
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center shadow-lg",
          bg,
          animated && "animate-pulse",
        )}
      >
        <Icon className="w-6 h-6" aria-hidden />
      </span>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

function ControlButton({
  onClick,
  active,
  label,
  Icon,
  inactiveLabel,
  hidden = false,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  Icon: IconType;
  activeColor: "white";
  inactiveLabel?: string;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
    >
      <span
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center transition-colors border-2",
          active
            ? "bg-white/10 hover:bg-white/15 border-white/10"
            : "bg-red-500/20 text-red-300 border-red-400/40",
        )}
      >
        <Icon className="w-5 h-5" aria-hidden />
      </span>
      {inactiveLabel ? (
        <span className="text-[11px] font-semibold">{inactiveLabel}</span>
      ) : null}
    </button>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
