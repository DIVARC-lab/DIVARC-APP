"use client";

import { useCallback, useRef } from "react";

type LongPressHandlers = {
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
  onPointerCancel: (event: React.PointerEvent) => void;
  onPointerLeave: (event: React.PointerEvent) => void;
  /* Empêche le menu contextuel natif sur long-press mobile (iOS Safari). */
  onContextMenu: (event: React.MouseEvent) => void;
};

type UseLongPressOptions = {
  /** Délai avant déclenchement en ms. Défaut 400. */
  delay?: number;
  /** Distance max en px avant cancel. Défaut 10. */
  moveThreshold?: number;
  /** Si true, désactive complètement (utile pour bypass hover desktop). */
  disabled?: boolean;
};

/* Détecte un appui long sur mobile/tactile sans déclencher de scroll
 * accidental. Annule au moindre move > moveThreshold (l'utilisateur scrolle).
 * Le callback `onLongPress` reçoit l'event d'origine pour position. */
export function useLongPress(
  onLongPress: (event: React.PointerEvent) => void,
  { delay = 400, moveThreshold = 10, disabled = false }: UseLongPressOptions = {},
): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const triggeredRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
    triggeredRef.current = false;
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (disabled) return;
      /* On ignore les events souris (pour rester mobile-only). Un user
         desktop garde le hover-to-reveal classique. */
      if (event.pointerType === "mouse") return;
      startRef.current = { x: event.clientX, y: event.clientY };
      triggeredRef.current = false;
      timerRef.current = setTimeout(() => {
        triggeredRef.current = true;
        onLongPress(event);
      }, delay);
    },
    [disabled, delay, onLongPress],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!startRef.current || !timerRef.current) return;
      const dx = event.clientX - startRef.current.x;
      const dy = event.clientY - startRef.current.y;
      if (Math.hypot(dx, dy) > moveThreshold) {
        clear();
      }
    },
    [moveThreshold, clear],
  );

  const onContextMenu = useCallback((event: React.MouseEvent) => {
    /* Empêche le menu contextuel natif iOS qui apparaît parfois en
       parallèle du long-press custom. */
    if (triggeredRef.current) {
      event.preventDefault();
    }
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu,
  };
}
