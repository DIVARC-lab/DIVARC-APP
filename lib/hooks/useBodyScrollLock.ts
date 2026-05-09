"use client";

import { useEffect } from "react";

/* Hook qui bloque le scroll du body quand `enabled` est true. Restaure
 * la valeur originale au unmount ou quand enabled repasse false.
 *
 * Sauvegarde aussi `position` + `top` pour préserver la position de scroll
 * (sinon Safari iOS scroll au top quand on remet overflow:auto).
 *
 * Usage :
 *   useBodyScrollLock(modalOpen);
 */
export function useBodyScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof document === "undefined") return;

    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    /* Compense la disparition de la scrollbar pour éviter un layout shift
       sur desktop. innerWidth - clientWidth = largeur de la scrollbar. */
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [enabled]);
}
