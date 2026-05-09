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
 */
export function useHideOnScroll(threshold = 80): boolean {
  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function onScroll() {
      const y = window.scrollY;
      const lastY = lastYRef.current;
      const goingDown = y > lastY;
      const beyondThreshold = y > threshold;

      if (goingDown && beyondThreshold && !hidden) {
        setHidden(true);
      } else if (!goingDown && hidden) {
        setHidden(false);
      }

      lastYRef.current = y;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, hidden]);

  return hidden;
}
