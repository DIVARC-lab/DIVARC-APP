"use client";

/* Sprint E (LiveKit) — Client component utilisant VideoConference,
 * le composant tout-en-un de @livekit/components-react.
 *
 * Flow :
 *  1. Fetch token via /api/circles/live/[roomId]/token
 *  2. PreJoin : preview caméra/micro + choix nom avant connect
 *  3. VideoConference : grille auto + ControlBar + audio mixdown
 *  4. Disconnect → redirect /circles/[slug]/live
 *
 * VideoConference inclut :
 *   - Auto-publish des tracks audio (+ vidéo si video={true})
 *   - GridLayout / FocusLayout adaptatif
 *   - ParticipantTile pour chaque peer
 *   - ControlBar (mic / cam / screenshare / leave)
 *   - RoomAudioRenderer (mixdown audio des autres)
 *   - StartAudio (fallback autoplay blocage browser)
 *   - ConnectionStateToast (notif si reconnect/disconnect)
 *
 * Pour les rooms audio-only on cache la cam au PreJoin + on désactive
 * la pub vidéo dans LiveKitRoom. */

import "@livekit/components-styles";

import {
  LiveKitRoom,
  PreJoin,
  VideoConference,
  type LocalUserChoices,
} from "@livekit/components-react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = {
  roomId: string;
  roomTitle: string;
  roomKind: "audio" | "video";
  circleSlug: string;
};

type TokenResponse = {
  token: string;
  wsUrl: string;
  canPublish: boolean;
};

export function LiveRoomClient({ roomId, roomKind, circleSlug }: Props) {
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

  /* === États dégradés === */
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

  /* === PreJoin : choix mic/cam + preview avant connect === */
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
            Vérifie ton micro{roomKind === "video" ? " et ta caméra" : ""}{" "}
            avant de te connecter.
          </p>
          <PreJoin
            defaults={{
              videoEnabled: roomKind === "video",
              audioEnabled: true,
            }}
            onSubmit={(values) => setChoices(values)}
            onError={(err) => {
              console.error("[PreJoin] error", err);
              toast.error(
                "Impossible d'accéder à ton micro ou ta caméra. Vérifie les permissions du navigateur.",
              );
            }}
          />
        </div>
      </div>
    );
  }

  /* === Connect to LiveKit room === */
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
        console.error("[LiveKit] error", err);
        toast.error(`Erreur live : ${err.message}`);
      }}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
