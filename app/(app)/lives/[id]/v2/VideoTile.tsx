"use client";

/* Étape 6/60 — VideoTile : 1 case du panel.
 *
 * Affiche le track vidéo LiveKit du participant + overlays :
 *   - Badge HOST gold si is_host
 *   - Username pill bottom-left
 *   - Mic muted indicator (bottom-right)
 *   - Gifts counter top-right
 *   - Speaking border gold pulsé si actif
 *   - Camera off → avatar XL centré */

import { Crown, Gift, MicOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { Track, type Participant, type RemoteTrackPublication, type LocalTrackPublication } from "livekit-client";
import { Avatar } from "@/components/ui/Avatar";

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
  participant: Participant | null;
  meta: PanelGuest | { user_id: string; username: string | null; avatar_url: string | null };
  isHost: boolean;
  className?: string;
};

function formatCount(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`.replace(".0", "");
  return `${Math.floor(n / 1000)}k`;
}

export function VideoTile({ participant, meta, isHost, className }: Props) {
  const videoPublication = participant?.getTrackPublication(
    Track.Source.Camera,
  ) as RemoteTrackPublication | LocalTrackPublication | undefined;

  const hasVideo =
    videoPublication &&
    !videoPublication.isMuted &&
    videoPublication.track;

  const giftCount =
    (meta as PanelGuest).gifts_received_during_session ?? 0;
  const isMuted = participant?.isMicrophoneEnabled === false;
  const isSpeaking = participant?.isSpeaking ?? false;
  const displayName = meta.username ?? "Spectateur";

  return (
    <div
      className={`relative overflow-hidden bg-black ${className ?? ""}`}
    >
      {/* Video element : attach LiveKit track directement au div. */}
      {hasVideo && videoPublication ? (
        <LiveVideoElement publication={videoPublication} />
      ) : (
        /* Camera off → avatar XL centré + gradient navy. */
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-night via-night/95 to-night-soft">
          <Avatar
            src={meta.avatar_url}
            fullName={displayName}
            size="xxl"
          />
        </div>
      )}

      {/* Speaking border gold pulsé. */}
      {isSpeaking ? (
        <span
          aria-hidden
          className="absolute inset-0 border-[3px] border-gold animate-pulse pointer-events-none"
        />
      ) : null}

      {/* Badge HOST gold top-left. */}
      {isHost ? (
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 h-5 rounded bg-gold text-night text-[9.5px] font-extrabold uppercase tracking-wider">
          <Crown className="w-2.5 h-2.5" aria-hidden strokeWidth={2.6} />
          Host
        </span>
      ) : null}

      {/* Gifts counter top-right. */}
      {giftCount > 0 ? (
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 h-5 rounded-full bg-night/60 backdrop-blur text-gold-soft text-[10px] font-bold">
          <Gift className="w-2.5 h-2.5" aria-hidden />
          {formatCount(giftCount)}
        </span>
      ) : null}

      {/* Username pill bottom-left. */}
      <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 max-w-[70%] px-2 h-6 rounded-full bg-night/55 backdrop-blur-md">
        <Avatar
          src={meta.avatar_url}
          fullName={displayName}
          size="sm"
        />
        <span className="text-[11px] font-bold text-cream truncate">
          {displayName}
        </span>
      </div>

      {/* Muted icon bottom-right. */}
      {isMuted ? (
        <span className="absolute bottom-2 right-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-night/55 backdrop-blur-md text-cream">
          <MicOff className="w-3 h-3" aria-hidden />
        </span>
      ) : null}
    </div>
  );
}

/* Composant qui attache un track LiveKit à un <div> via track.attach(). */
function LiveVideoElement({
  publication,
}: {
  publication: RemoteTrackPublication | LocalTrackPublication;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const track = publication.track;
    if (!container || !track) return;

    const videoEl = track.attach();
    videoEl.classList.add("w-full", "h-full", "object-cover");
    (videoEl as HTMLVideoElement).playsInline = true;
    (videoEl as HTMLVideoElement).autoplay = true;
    container.innerHTML = "";
    container.appendChild(videoEl);

    return () => {
      try {
        track.detach(videoEl);
      } catch {
        /* ignore */
      }
    };
  }, [publication]);

  return <div ref={containerRef} className="w-full h-full" />;
}
