"use client";

/* Layer global des cœurs flottants — affiche TOUS les hearts du context.
 * Positionné en fixed pour pouvoir spawn depuis n'importe où (bouton ou
 * tap zone) avec coordonnées absolues écran. */

import { Heart } from "lucide-react";
import { useLiveLikes } from "./LiveLikesContext";

export function LiveHeartsLayer() {
  const { hearts } = useLiveLikes();

  if (hearts.length === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    >
      {hearts.map((h) => (
        <span
          key={h.id}
          className="absolute animate-heart-float"
          style={
            {
              left: `${h.originX}px`,
              top: `${h.originY}px`,
              color: h.color,
              "--x": `${h.driftX}px`,
            } as React.CSSProperties
          }
        >
          <Heart
            className="w-7 h-7 fill-current drop-shadow-lg"
            aria-hidden
            strokeWidth={2.4}
          />
        </span>
      ))}
    </div>
  );
}
