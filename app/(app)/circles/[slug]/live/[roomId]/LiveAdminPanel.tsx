"use client";

/* Sprint E (LiveKit) — Panel admin overlay pour kick/mute les autres
 * participants. Rendu côté du composant VideoConference, ne touche
 * pas son arbre interne. */

import {
  useLocalParticipant,
  useParticipants,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { MicOff, Shield, UserX, X } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import {
  liveKickParticipant,
  liveMuteParticipantTrack,
} from "../../live-admin-actions";

type Props = {
  roomId: string;
  onClose: () => void;
};

export function LiveAdminPanel({ roomId, onClose }: Props) {
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
          aria-label="Fermer"
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
            return (
              <li
                key={p.identity}
                className="px-3 py-2 flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-cream truncate">
                    {p.name || "Membre"}
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
                    title="Exclure de la salle"
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
