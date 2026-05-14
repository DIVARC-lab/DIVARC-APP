"use client";

import { useEffect, useRef, useState } from "react";

/* useHideOnScroll — détecte le sens de scroll pour masquer une top bar
 * sur scroll vers le bas et la révéler sur scroll vers le haut (pattern
 * Facebook mobile, Instagram, Twitter).
 *
 * Threshold : on n'active le hide qu'à partir de N pixels depuis le top
 * pour éviter le flicker au début de la page.
 *
 * Usage :
 *   const hidden = useHideOnScroll(80);
 *   <header style={{ transform: hidden ? "translateY(-100%)" : "translateY(0)" }} />
 *
 * Note critique : on stocke `hidden` dans un ref + on utilise setState
 * fonctionnel, pour que le useEffect soit monté UNE seule fois (deps = []).
 * Sans ça, chaque scroll-triggered setHidden détacherait/rattacherait le
 * listener — micro-jank permanent sur desktop.
 */
export function useHideOnScroll(threshold = 80): boolean {
  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef(0);
  const hiddenRef = useRef(false);
  const thresholdRef = useRef(threshold);

  /* Synchro les refs avec les valeurs courantes (pas re-mount du listener). */
  thresholdRef.current = threshold;
  hiddenRef.current = hidden;

  useEffect(() => {
    if (typeof window === "undefined") return;

    let ticking = false;

    function onScroll() {
      /* rAF throttle : un seul update par frame, pas par scroll event. */
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const lastY = lastYRef.current;
        const goingDown = y > lastY;
        const beyondThreshold = y > thresholdRef.current;
        const currentlyHidden = hiddenRef.current;

        if (goingDown && beyondThreshold && !currentlyHidden) {
          setHidden(true);
        } else if (!goingDown && currentlyHidden) {
          setHidden(false);
        }

        lastYRef.current = y;
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []); /* IMPORTANT : deps = [] — listener monté une seule fois. */

  return hidden;
}
