"use client";

/* Sprint E (LiveKit) — Client component qui monte la LiveKitRoom.
 *
 * Flow :
 *  1. Mount → fetch /api/circles/live/[roomId]/token (auth + grants)
 *  2. PreJoin : choix mic/cam + préview avant connect
 *  3. Connect → VideoConference (vidéo) ou AudioConference custom (audio)
 *  4. Disconnect → redirect /circles/[slug]/live (avec router.replace)
 *
 * Pour les rooms audio, on n'active pas la caméra par défaut et on
 * cache les video tiles (juste pastilles avec nom + speaking indicator). */

import "@livekit/components-styles";

import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  StartAudio,
  useTracks,
} from "@livekit/components-react";
import { RoomEvent, Track } from "livekit-client";
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

export function LiveRoomClient({
  roomId,
  roomKind,
  circleSlug,
}: Props) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/circles/live/${roomId}/token`);
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          if (alive) {
            setError(data.error ?? "token_failed");
          }
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
        <p className="mt-2 text-[12px] text-cream/60">
          Code : {error}
        </p>
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
          Connexion à la salle…
        </p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      audio={true}
      video={roomKind === "video"}
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
      {roomKind === "video" ? <VideoConferenceLayout /> : <AudioConferenceLayout />}
      <RoomAudioRenderer />
      <StartAudio label="Activer le son" />
      <div className="absolute bottom-0 inset-x-0 px-3 py-3 bg-gradient-to-t from-night via-night/80 to-transparent">
        <ControlBar
          controls={{
            microphone: true,
            camera: roomKind === "video",
            screenShare: roomKind === "video",
            chat: false,
            leave: true,
          }}
          variation="minimal"
        />
      </div>
    </LiveKitRoom>
  );
}

/* Layout vidéo : grille de tiles classique. */
function VideoConferenceLayout() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false, updateOnlyOn: [RoomEvent.ActiveSpeakersChanged] },
  );

  return (
    <div className="absolute inset-0 pb-24">
      <GridLayout tracks={tracks} style={{ height: "100%" }}>
        <ParticipantTile />
      </GridLayout>
    </div>
  );
}

/* Layout audio : pastilles compactes, indicateur de speaking. */
function AudioConferenceLayout() {
  const tracks = useTracks([
    { source: Track.Source.Microphone, withPlaceholder: true },
  ]);

  return (
    <div className="absolute inset-0 pb-24 overflow-y-auto p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tracks.map((trackRef, i) => (
          <ParticipantTile
            key={trackRef.participant.identity + i}
            trackRef={trackRef}
            className="aspect-square !rounded-full !overflow-hidden bg-cream/5"
          />
        ))}
      </div>
    </div>
  );
}
