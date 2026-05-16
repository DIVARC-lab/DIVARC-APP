"use client";

/* Overlay invisible sur la zone vidéo — détecte le **double-tap** pour
 * liker à la position du tap, exactement comme TikTok.
 *
 * Single-tap est laissé intact pour ne pas interférer avec les contrôles
 * LiveKit (mute, fullscreen, etc.). Window 350ms entre 2 taps. */

import { useRef } from "react";
import { useLiveLikes } from "./LiveLikesContext";

const DOUBLE_TAP_WINDOW_MS = 350;

export function LiveTapToLikeOverlay() {
  const { triggerLike } = useLiveLikes();
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const now = Date.now();
    const x = e.clientX;
    const y = e.clientY;
    const last = lastTapRef.current;
    if (
      last &&
      now - last.t < DOUBLE_TAP_WINDOW_MS &&
      Math.hypot(x - last.x, y - last.y) < 50
    ) {
      /* Double-tap détecté → like à la position. */
      triggerLike(x, y);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { t: now, x, y };
    }
  }

  return (
    <div
      onPointerUp={handlePointerUp}
      aria-hidden
      /* z-15 : au-dessus de la vidéo (z-0) mais sous tous les overlays
         (z-20+). Tap passe à travers vers les contrôles LiveKit pour
         single-tap (on n'intercepte pas), mais on intercepte pour
         détecter le double-tap. */
      className="absolute inset-0 z-15"
      style={{ touchAction: "manipulation" }}
    />
  );
}
