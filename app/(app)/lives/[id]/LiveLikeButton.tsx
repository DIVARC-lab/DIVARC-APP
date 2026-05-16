"use client";

/* Bouton "Like" gratuit consommateur du LiveLikesContext.
 * Pas de toggle : chaque click = 1 like (TikTok-style).
 * Le compteur est synchronisé en temps réel via le context. */

import { Heart } from "lucide-react";
import { useRef } from "react";
import { useLiveLikes } from "./LiveLikesContext";

function formatCount(n: number): string {
  if (n < 1000) return n.toLocaleString("fr-FR");
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`.replace(".0", "");
  if (n < 1_000_000) return `${Math.floor(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`.replace(".0", "");
}

export function LiveLikeButton() {
  const { count, triggerLike } = useLiveLikes();
  const btnRef = useRef<HTMLButtonElement | null>(null);

  function handleLike() {
    const rect = btnRef.current?.getBoundingClientRect();
    /* Spawn depuis le centre du bouton. */
    const x = rect ? rect.left + rect.width / 2 : undefined;
    const y = rect ? rect.top + rect.height / 2 : undefined;
    triggerLike(x, y);
  }

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleLike}
      aria-label="Liker le live"
      className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-cream/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 text-[11px] font-bold transition-colors active:scale-95"
    >
      <Heart
        className="w-3.5 h-3.5 fill-current"
        aria-hidden
        strokeWidth={2.4}
      />
      <span className="tabular-nums">{formatCount(count)}</span>
    </button>
  );
}
