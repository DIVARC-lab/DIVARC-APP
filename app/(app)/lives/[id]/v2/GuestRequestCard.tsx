"use client";

/* Étape 20/60 — Guest Request Card pour le host.
 *
 * Carte qui slide depuis le haut quand une demande arrive.
 * - Avatar + info user + badges (Tu suis / Te suit)
 * - Compte à rebours circulaire (60s avant auto-expire)
 * - Boutons Refuser / Accepter (swipe gestures sur mobile via Framer)
 * - Sound notification + glow gold pulse */

import { motion, useDragControls } from "motion/react";
import { Check, Loader2, User, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import {
  acceptGuestRequest,
  removeGuestFromPanel,
} from "../../session-actions";
import { denyStageRequest } from "../../stage-actions";

type Request = {
  id: string;
  session_id: string;
  requester_id: string;
  username: string | null;
  avatar_url: string | null;
  message: string | null;
  user_follower_count: number;
  user_is_following_host: boolean;
  user_is_followed_by_host: boolean;
  created_at: string;
  expires_at: string | null;
};

type Props = {
  request: Request;
  onResolved: (id: string) => void;
};

function formatCount(n: number): string {
  if (n < 1000) return n.toLocaleString("fr-FR");
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`.replace(".0", "");
  return `${Math.floor(n / 1000)}k`;
}

export function GuestRequestCard({ request, onResolved }: Props) {
  const [remainingSec, setRemainingSec] = useState<number>(60);
  const [isPending, startTransition] = useTransition();
  const dragControls = useDragControls();
  const playedSoundRef = useRef(false);

  /* Compte à rebours basé sur expires_at. */
  useEffect(() => {
    function tick() {
      if (!request.expires_at) {
        setRemainingSec(60);
        return;
      }
      const ms = new Date(request.expires_at).getTime() - Date.now();
      setRemainingSec(Math.max(0, Math.ceil(ms / 1000)));
    }
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [request.expires_at]);

  /* Sound notif (1 fois). */
  useEffect(() => {
    if (playedSoundRef.current) return;
    playedSoundRef.current = true;
    try {
      const audio = new Audio("/sounds/ding.mp3");
      audio.volume = 0.4;
      void audio.play().catch(() => undefined);
    } catch {
      /* pas de fichier ou bloqué — silencieux */
    }
  }, []);

  function handleAccept() {
    startTransition(async () => {
      const res = await acceptGuestRequest({ requestId: request.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${request.username ?? "Spectateur"} est sur scène.`);
      onResolved(request.id);
    });
  }

  function handleDeny() {
    startTransition(async () => {
      const res = await denyStageRequest({ requestId: request.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onResolved(request.id);
    });
  }

  const remainingPercent = Math.min(100, Math.round((remainingSec / 60) * 100));
  const name = request.username ?? "Spectateur";

  return (
    <motion.div
      initial={{ y: -120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ duration: 0.45, type: "spring", stiffness: 220 }}
      drag="x"
      dragControls={dragControls}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, info) => {
        if (info.offset.x > 80) handleAccept();
        else if (info.offset.x < -80) handleDeny();
      }}
      className="rounded-3xl bg-black/75 backdrop-blur-xl border-2 border-gold text-white shadow-[0_0_40px_-4px_rgba(244,185,66,0.5)] p-3.5 animate-pulse-glow pointer-events-auto"
    >
      <div className="flex items-start gap-3">
        <Avatar src={request.avatar_url} fullName={name} size="md-bold" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[13px] font-extrabold text-cream truncate">
              {name}
            </p>
            {request.user_is_followed_by_host ? (
              <span className="inline-flex items-center h-4 px-1.5 rounded-sm bg-gold text-night text-[8.5px] font-extrabold uppercase tracking-wider">
                Tu suis
              </span>
            ) : null}
            {request.user_is_following_host ? (
              <span className="inline-flex items-center h-4 px-1.5 rounded-sm bg-cream/15 text-cream text-[8.5px] font-extrabold uppercase tracking-wider">
                Te suit
              </span>
            ) : null}
          </div>
          <p className="text-[10.5px] text-cream/60 mt-0.5">
            {formatCount(request.user_follower_count)} followers
          </p>
          <p className="text-[11.5px] text-cream/80 italic mt-1">
            veut monter sur le live
          </p>
          {request.message ? (
            <p className="text-[11px] text-cream/70 italic mt-1 line-clamp-2">
              « {request.message} »
            </p>
          ) : null}
        </div>

        {/* Countdown circulaire. */}
        <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 48 48"
            aria-hidden
          >
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="rgba(244,185,66,0.2)"
              strokeWidth="3"
              fill="none"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="#f4b942"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 20}
              strokeDashoffset={2 * Math.PI * 20 * (1 - remainingPercent / 100)}
              className="transition-[stroke-dashoffset] duration-500"
            />
          </svg>
          <span className="relative text-[11px] font-extrabold text-gold tabular-nums">
            {remainingSec}s
          </span>
        </div>
      </div>

      {/* Boutons */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleDeny}
          disabled={isPending}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-full bg-white/10 text-cream hover:bg-rose-500/20 hover:text-rose-200 text-[12px] font-bold transition-colors disabled:opacity-60"
        >
          <X className="w-3.5 h-3.5" aria-hidden />
          Refuser
        </button>
        <button
          type="button"
          onClick={handleAccept}
          disabled={isPending}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-full bg-gold text-night text-[12px] font-extrabold hover:bg-gold-soft transition-colors disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="w-3.5 h-3.5" aria-hidden strokeWidth={2.6} />
          )}
          Accepter
        </button>
      </div>

      <p className="mt-2 text-[9.5px] text-cream/40 text-center">
        Swipe ← refuser · → accepter
      </p>
    </motion.div>
  );
}
