"use client";

/* Variante "rail vertical" du LiveLikeButton — icône grosse cœur + count
 * en dessous, style cohérent avec les autres boutons du right rail. */

import { Heart } from "lucide-react";
import { useRef } from "react";
import { useLiveLikes } from "./LiveLikesContext";

function formatCount(n: number): string {
  if (n < 1000) return n.toLocaleString("fr-FR");
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`.replace(".0", "");
  if (n < 1_000_000) return `${Math.floor(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`.replace(".0", "");
}

export function RailLikeButton() {
  const { count, triggerLike } = useLiveLikes();
  const btnRef = useRef<HTMLButtonElement | null>(null);

  function handleLike() {
    const rect = btnRef.current?.getBoundingClientRect();
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
      className="group flex flex-col items-center gap-0.5"
    >
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-night/70 backdrop-blur-md border border-rose-300/30 text-rose-300 group-hover:bg-rose-500/20 group-hover:text-rose-200 transition-colors shadow-lg active:scale-90">
        <Heart
          className="w-5 h-5 fill-current"
          aria-hidden
          strokeWidth={2}
        />
      </span>
      <span className="text-[9.5px] font-extrabold text-rose-200 tabular-nums drop-shadow">
        {formatCount(count)}
      </span>
    </button>
  );
}
