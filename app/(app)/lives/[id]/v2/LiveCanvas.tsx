"use client";

/* Étapes 5/60 — LiveCanvas : sélectionne le layout selon nombre de
 * participants (host + guests) et rend la grille de VideoTiles.
 *
 * 6 layouts : solo, panel_2 (split horizontal), panel_4 (2×2),
 * panel_6 (2×3), panel_8 (2×4), audio_only.
 *
 * Transition CSS-grid animée 400ms quand le layout change. */

import { useRoomContext } from "@livekit/components-react";
import { useEffect, useState } from "react";
import type { Participant } from "livekit-client";
import { VideoTile } from "./VideoTile";

type PanelGuest = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  position: number;
  is_muted: boolean;
  is_video_off: boolean;
  gifts_received_during_session: number;
};

type Props = {
  hostId: string;
  hostMeta: {
    user_id: string;
    username: string | null;
    avatar_url: string | null;
  };
  layout:
    | "solo"
    | "panel_2"
    | "panel_4"
    | "panel_6"
    | "panel_8"
    | "audio_only";
  guests: PanelGuest[];
};

export function LiveCanvas({ hostId, hostMeta, layout, guests }: Props) {
  const room = useRoomContext();
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    if (!room) return;
    function updateParticipants() {
      const all = [
        room.localParticipant,
        ...Array.from(room.remoteParticipants.values()),
      ];
      setParticipants(all);
    }
    updateParticipants();
    room.on("participantConnected", updateParticipants);
    room.on("participantDisconnected", updateParticipants);
    room.on("trackSubscribed", updateParticipants);
    room.on("trackUnsubscribed", updateParticipants);
    room.on("activeSpeakersChanged", updateParticipants);
    return () => {
      room.off("participantConnected", updateParticipants);
      room.off("participantDisconnected", updateParticipants);
      room.off("trackSubscribed", updateParticipants);
      room.off("trackUnsubscribed", updateParticipants);
      room.off("activeSpeakersChanged", updateParticipants);
    };
  }, [room]);

  /* Sort guests by position. */
  const orderedGuests = [...guests].sort((a, b) => a.position - b.position);

  const hostParticipant =
    participants.find((p) => p.identity === hostId) ?? null;

  function participantFor(userId: string): Participant | null {
    return participants.find((p) => p.identity === userId) ?? null;
  }

  /* Audio only : layout liste compacte avec avatars sans vidéos. */
  if (layout === "audio_only") {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-night via-night-soft to-night flex flex-col items-center justify-center gap-4 p-6">
        <div className="grid grid-cols-3 gap-3 max-w-md w-full">
          <VideoTile
            participant={hostParticipant}
            meta={hostMeta}
            isHost
            className="aspect-square rounded-2xl"
          />
          {orderedGuests.map((g) => (
            <VideoTile
              key={g.user_id}
              participant={participantFor(g.user_id)}
              meta={g}
              isHost={false}
              className="aspect-square rounded-2xl"
            />
          ))}
        </div>
      </div>
    );
  }

  /* Solo : host plein écran. */
  if (layout === "solo") {
    return (
      <div className="absolute inset-0">
        <VideoTile
          participant={hostParticipant}
          meta={hostMeta}
          isHost
          className="w-full h-full"
        />
      </div>
    );
  }

  /* Grilles split-screen. */
  const gridClass = (() => {
    switch (layout) {
      case "panel_2":
        return "grid-cols-1 grid-rows-2";
      case "panel_4":
        return "grid-cols-2 grid-rows-2";
      case "panel_6":
        return "grid-cols-2 grid-rows-3";
      case "panel_8":
        return "grid-cols-2 grid-rows-4";
      default:
        return "grid-cols-1 grid-rows-1";
    }
  })();

  return (
    <div
      className={`absolute inset-0 grid gap-0.5 transition-all duration-500 ease-out ${gridClass}`}
    >
      <VideoTile
        participant={hostParticipant}
        meta={hostMeta}
        isHost
      />
      {orderedGuests.map((g) => (
        <VideoTile
          key={g.user_id}
          participant={participantFor(g.user_id)}
          meta={g}
          isHost={false}
        />
      ))}
    </div>
  );
}
