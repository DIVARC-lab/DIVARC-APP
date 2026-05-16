"use client";

/* Étape 4/60 — Top bar overlay TikTok-style.
 *
 * - LEFT : host pill (avatar + name + verified + bouton Follow gold)
 * - RIGHT : viewers bubble (AvatarStack + count) + close button
 * - Gradient noir → transparent en background pour lisibilité */

import { Eye, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";

type Host = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  verified?: boolean;
};

type Props = {
  host: Host;
  viewersCount: number;
  isFollowing: boolean;
  onFollow: () => void;
  onClose?: () => void;
};

function formatCount(n: number): string {
  if (n < 1000) return n.toLocaleString("fr-FR");
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`.replace(".0", "");
  if (n < 1_000_000) return `${Math.floor(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`.replace(".0", "");
}

export function LiveTopBar({
  host,
  viewersCount,
  isFollowing,
  onFollow,
  onClose,
}: Props) {
  const router = useRouter();

  function handleClose() {
    if (onClose) onClose();
    else router.replace("/lives");
  }

  const displayName = host.full_name ?? host.username ?? "Streamer";

  return (
    <div
      className="absolute top-0 left-0 right-0 z-30"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Gradient background. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-transparent pointer-events-none"
      />

      <div className="relative flex items-center gap-2 px-3 py-3">
        {/* LEFT : host info pill. */}
        <div className="flex items-center gap-2 max-w-[60%] bg-black/40 backdrop-blur-md rounded-full pl-1 pr-2 py-1 border border-white/10">
          <Avatar
            src={host.avatar_url}
            fullName={displayName}
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-[11.5px] font-bold text-white truncate leading-tight">
              {displayName}
              {host.verified ? (
                <span className="ml-1 text-gold">✓</span>
              ) : null}
            </p>
            {host.username ? (
              <p className="text-[9.5px] text-white/70 truncate leading-tight">
                @{host.username}
              </p>
            ) : null}
          </div>
          {!isFollowing ? (
            <button
              type="button"
              onClick={onFollow}
              className="ml-1 inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-gold text-night text-[10px] font-extrabold uppercase tracking-wider hover:bg-gold-soft transition-colors active:scale-95"
            >
              <UserPlus className="w-2.5 h-2.5" aria-hidden strokeWidth={2.6} />
              Suivre
            </button>
          ) : null}
        </div>

        {/* RIGHT : viewers + close. */}
        <div className="ml-auto flex items-center gap-1.5">
          <div className="inline-flex items-center gap-1 px-2.5 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white">
            <Eye className="w-3 h-3" aria-hidden />
            <span className="text-[11px] font-extrabold tabular-nums">
              {formatCount(viewersCount)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fermer le live"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-colors active:scale-95"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
