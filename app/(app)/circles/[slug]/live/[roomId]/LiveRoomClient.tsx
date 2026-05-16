"use client";

/* Sprint E (LiveKit) — Salle Live avec ControlBar FR + Admin Panel + Raise Hand.
 *
 * Refactor : on n'utilise plus VideoConference (composant tout-en-un anglais)
 * mais on assemble les briques nous-mêmes pour pouvoir :
 *  - Mettre les boutons en français
 *  - Ajouter un panel admin (kick/mute autres participants)
 *  - Implémenter "Lever la main" via data messages LiveKit
 *  - Toggler un chat texte côté
 */

import "@livekit/components-styles";

import {
  Chat,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  PreJoin,
  RoomAudioRenderer,
  StartAudio,
  useDataChannel,
  useLocalParticipant,
  useParticipants,
  useTrackToggle,
  useTracks,
  type LocalUserChoices,
} from "@livekit/components-react";
import { RoomEvent, Track } from "livekit-client";
import {
  Hand,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Shield,
  Smile,
  UserX,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  liveKickParticipant,
  liveMuteParticipantTrack,
} from "../../live-admin-actions";

type Props = {
  roomId: string;
  roomTitle: string;
  roomKind: "audio" | "video";
  circleSlug: string;
  /* Sprint E — passé depuis page.tsx pour activer le panel admin. */
  isModerator: boolean;
};

type TokenResponse = { token: string; wsUrl: string };

export function LiveRoomClient({
  roomId,
  roomKind,
  circleSlug,
  isModerator,
}: Props) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<LocalUserChoices | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/circles/live/${roomId}/token`);
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          if (alive) setError(data.error ?? "token_failed");
          return;
        }
        const data = (await res.json()) as TokenResponse;
        if (alive) {
          setToken(data.token);
          setWsUrl(data.wsUrl);
        }
      } catch {
        if (alive) setError("network_error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [roomId]);

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[14px] font-bold text-cream">
          Impossible de rejoindre cette salle.
        </p>
        <p className="mt-2 text-[12px] text-cream/60">Code : {error}</p>
        <button
          type="button"
          onClick={() => router.replace(`/circles/${circleSlug}/live`)}
          className="mt-4 h-9 px-4 rounded-full bg-cream text-night text-[12px] font-bold"
        >
          Retour
        </button>
      </div>
    );
  }

  if (!token || !wsUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-cream" aria-hidden />
        <p className="mt-3 text-[12px] text-cream/60">
          Préparation de la salle…
        </p>
      </div>
    );
  }

  if (!choices) {
    return (
      <div className="h-full flex items-center justify-center p-4 bg-night">
        <div
          className="w-full max-w-2xl rounded-3xl bg-cream/5 border border-cream/10 p-5"
          data-lk-theme="default"
        >
          <h2 className="text-[14px] font-bold text-cream mb-1 text-center">
            Prêt à rejoindre la salle ?
          </h2>
          <p className="text-[11.5px] text-cream/60 text-center mb-4">
            Vérifie ton micro{roomKind === "video" ? " et ta caméra" : ""} avant
            de te connecter.
          </p>
          <PreJoin
            defaults={{
              videoEnabled: roomKind === "video",
              audioEnabled: true,
            }}
            onSubmit={(values) => setChoices(values)}
            onError={(err) => {
              console.error("[PreJoin]", err);
              toast.error(
                "Impossible d'accéder au micro ou caméra. Vérifie les permissions.",
              );
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      audio={choices.audioEnabled}
      video={roomKind === "video" ? choices.videoEnabled : false}
      data-lk-theme="default"
      className="h-full bg-night"
      onDisconnected={() => {
        toast("Tu as quitté la salle.");
        router.replace(`/circles/${circleSlug}/live`);
      }}
      onError={(err) => {
        console.error("[LiveKit]", err);
        toast.error(`Erreur live : ${err.message}`);
      }}
    >
      <RoomLayout
        roomId={roomId}
        roomKind={roomKind}
        circleSlug={circleSlug}
        isModerator={isModerator}
      />
      <RoomAudioRenderer />
      <StartAudio label="Activer le son" />
    </LiveKitRoom>
  );
}

/* ============================================================
 * RoomLayout : grille participants + ControlBar FR + AdminPanel + Chat
 * ============================================================ */
function RoomLayout({
  roomId,
  roomKind,
  circleSlug,
  isModerator,
}: {
  roomId: string;
  roomKind: "audio" | "video";
  circleSlug: string;
  isModerator: boolean;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());

  /* Sprint E — Raise hand via data channel.
     Topic "hand". Payload : {action: 'raise' | 'lower', identity}. */
  const { message, send } = useDataChannel("hand");
  useEffect(() => {
    if (!message) return;
    try {
      const data = JSON.parse(
        new TextDecoder().decode(message.payload),
      ) as { action: "raise" | "lower"; identity?: string };
      const id = data.identity ?? message.from?.identity;
      if (!id) return;
      setRaisedHands((prev) => {
        const next = new Set(prev);
        if (data.action === "raise") next.add(id);
        else next.delete(id);
        return next;
      });
    } catch {
      /* ignore malformed */
    }
  }, [message]);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Microphone, withPlaceholder: true },
    ],
    {
      onlySubscribed: false,
      updateOnlyOn: [RoomEvent.ActiveSpeakersChanged],
    },
  );

  /* Pour le layout audio, on ne garde que les tracks Microphone. */
  const audioTracks = useMemo(
    () => tracks.filter((t) => t.source === Track.Source.Microphone),
    [tracks],
  );
  /* Pour la vidéo : caméra + screenshare. */
  const videoTracks = useMemo(
    () =>
      tracks.filter(
        (t) =>
          t.source === Track.Source.Camera ||
          t.source === Track.Source.ScreenShare,
      ),
    [tracks],
  );

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Grille participants */}
      <div className="flex-1 relative overflow-hidden pb-24">
        {roomKind === "video" ? (
          <GridLayout tracks={videoTracks} style={{ height: "100%" }}>
            <ParticipantTile />
          </GridLayout>
        ) : (
          <div className="absolute inset-0 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {audioTracks.map((trackRef, i) => (
                <ParticipantTile
                  key={trackRef.participant.identity + i}
                  trackRef={trackRef}
                  className="!aspect-square !rounded-full !overflow-hidden bg-cream/5"
                />
              ))}
            </div>
          </div>
        )}

        {/* Liste compacte des mains levées en haut */}
        {raisedHands.size > 0 ? (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold text-night text-[11px] font-bold shadow-lg">
            <Hand className="w-3.5 h-3.5" aria-hidden />
            {raisedHands.size} main{raisedHands.size > 1 ? "s" : ""} levée
            {raisedHands.size > 1 ? "s" : ""}
          </div>
        ) : null}

        {/* Bouton admin (toggle panel) */}
        {isModerator ? (
          <button
            type="button"
            onClick={() => setAdminOpen((v) => !v)}
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-night/80 text-cream border border-cream/20 text-[11px] font-bold backdrop-blur"
          >
            <Shield className="w-3.5 h-3.5" aria-hidden />
            {adminOpen ? "Fermer modération" : "Modération"}
          </button>
        ) : null}
      </div>

      {/* Panel admin overlay */}
      {adminOpen && isModerator ? (
        <AdminPanel
          roomId={roomId}
          raisedHands={raisedHands}
          onClose={() => setAdminOpen(false)}
        />
      ) : null}

      {/* Chat overlay */}
      {chatOpen ? (
        <div className="absolute right-0 top-0 bottom-24 w-full sm:w-80 bg-night/95 border-l border-cream/10 backdrop-blur-md">
          <div className="flex items-center justify-between px-3 py-2 border-b border-cream/10">
            <p className="text-[12px] font-bold text-cream">Chat de la salle</p>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="text-cream/60 hover:text-cream"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <Chat className="!bg-transparent" />
        </div>
      ) : null}

      {/* ControlBar FR custom en bottom */}
      <FrenchControlBar
        roomKind={roomKind}
        circleSlug={circleSlug}
        onToggleChat={() => setChatOpen((v) => !v)}
        chatOpen={chatOpen}
        onRaiseHand={(raised) => {
          send(
            new TextEncoder().encode(
              JSON.stringify({
                action: raised ? "raise" : "lower",
              }),
            ),
            { topic: "hand" },
          );
        }}
      />
    </div>
  );
}

/* ============================================================
 * ControlBar custom français
 * ============================================================ */
function FrenchControlBar({
  roomKind,
  circleSlug,
  onToggleChat,
  chatOpen,
  onRaiseHand,
}: {
  roomKind: "audio" | "video";
  circleSlug: string;
  onToggleChat: () => void;
  chatOpen: boolean;
  onRaiseHand: (raised: boolean) => void;
}) {
  const router = useRouter();
  const { localParticipant } = useLocalParticipant();
  const mic = useTrackToggle({ source: Track.Source.Microphone });
  const cam = useTrackToggle({ source: Track.Source.Camera });
  const share = useTrackToggle({ source: Track.Source.ScreenShare });

  const [handRaised, setHandRaised] = useState(false);

  function toggleHand() {
    const next = !handRaised;
    setHandRaised(next);
    onRaiseHand(next);
  }

  function handleLeave() {
    void localParticipant.setMicrophoneEnabled(false);
    void localParticipant.setCameraEnabled(false);
    router.replace(`/circles/${circleSlug}/live`);
  }

  return (
    <div className="absolute bottom-0 inset-x-0 px-3 py-3 bg-gradient-to-t from-night via-night/90 to-transparent">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <ToolbarButton
          on={mic.enabled}
          onClick={() => mic.toggle()}
          icon={mic.enabled ? Mic : MicOff}
          label={mic.enabled ? "Micro" : "Activer micro"}
          tone={mic.enabled ? "default" : "warning"}
        />
        {roomKind === "video" ? (
          <ToolbarButton
            on={cam.enabled}
            onClick={() => cam.toggle()}
            icon={cam.enabled ? Video : VideoOff}
            label={cam.enabled ? "Caméra" : "Activer caméra"}
            tone={cam.enabled ? "default" : "warning"}
          />
        ) : null}
        {roomKind === "video" ? (
          <ToolbarButton
            on={share.enabled}
            onClick={() => share.toggle()}
            icon={MonitorUp}
            label={share.enabled ? "Arrêter partage" : "Partager"}
          />
        ) : null}
        <ToolbarButton
          on={handRaised}
          onClick={toggleHand}
          icon={Hand}
          label={handRaised ? "Baisser main" : "Lever main"}
          tone={handRaised ? "gold" : "default"}
        />
        <ToolbarButton
          on={chatOpen}
          onClick={onToggleChat}
          icon={MessageSquare}
          label="Chat"
        />
        <ToolbarButton
          on={false}
          onClick={handleLeave}
          icon={PhoneOff}
          label="Quitter"
          tone="danger"
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  on,
  onClick,
  icon: Icon,
  label,
  tone = "default",
}: {
  on: boolean;
  onClick: () => void;
  icon: typeof Mic;
  label: string;
  tone?: "default" | "warning" | "danger" | "gold";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-rose-600 text-white hover:bg-rose-700"
      : tone === "warning"
        ? "bg-amber-500 text-night hover:bg-amber-400"
        : tone === "gold"
          ? "bg-gold text-night hover:bg-gold/90"
          : on
            ? "bg-cream text-night hover:bg-cream/90"
            : "bg-cream/10 text-cream hover:bg-cream/20";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-10 px-3 sm:px-4 rounded-full text-[12px] font-bold transition-colors ${toneClass}`}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/* ============================================================
 * AdminPanel : liste participants + actions kick/mute (modérateurs)
 * ============================================================ */
function AdminPanel({
  roomId,
  raisedHands,
  onClose,
}: {
  roomId: string;
  raisedHands: Set<string>;
  onClose: () => void;
}) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const others = participants.filter(
    (p) => p.identity !== localParticipant.identity,
  );

  const handleKick = useCallback(
    async (identity: string) => {
      if (!confirm("Exclure ce participant de la salle ?")) return;
      const res = await liveKickParticipant({
        roomId,
        participantIdentity: identity,
      });
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Participant exclu.");
      }
    },
    [roomId],
  );

  const handleMute = useCallback(
    async (identity: string, trackSid: string) => {
      const res = await liveMuteParticipantTrack({
        roomId,
        participantIdentity: identity,
        trackSid,
      });
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Micro coupé.");
      }
    },
    [roomId],
  );

  return (
    <div className="absolute right-3 top-14 z-30 w-72 max-h-[60vh] rounded-2xl bg-night/95 border border-cream/10 backdrop-blur-md shadow-2xl overflow-y-auto">
      <div className="flex items-center justify-between px-3 py-2 border-b border-cream/10 sticky top-0 bg-night/95">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-gold" aria-hidden />
          <p className="text-[12px] font-bold text-cream">
            Modération · {participants.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-cream/60 hover:text-cream"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <ul className="divide-y divide-cream/5">
        {others.length === 0 ? (
          <li className="px-3 py-4 text-center text-[11.5px] text-cream/40">
            Aucun autre participant pour l&apos;instant.
          </li>
        ) : (
          others.map((p) => {
            const micTrack = p.getTrackPublication(Track.Source.Microphone);
            const isHandRaised = raisedHands.has(p.identity);
            return (
              <li
                key={p.identity}
                className="px-3 py-2 flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-cream truncate flex items-center gap-1.5">
                    {p.name || "Membre"}
                    {isHandRaised ? (
                      <Hand
                        className="w-3 h-3 text-gold"
                        aria-label="Main levée"
                      />
                    ) : null}
                  </p>
                  <p className="text-[10px] text-cream/40">
                    {micTrack?.isMuted ? "Micro coupé" : "Micro actif"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {micTrack && !micTrack.isMuted ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleMute(p.identity, micTrack.trackSid)
                      }
                      title="Couper le micro"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                    >
                      <MicOff className="w-3.5 h-3.5" aria-hidden />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleKick(p.identity)}
                    title="Exclure"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-600/20 text-rose-300 hover:bg-rose-600/30"
                  >
                    <UserX className="w-3.5 h-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
