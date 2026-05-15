"use client";

import { useEffect } from "react";

/* Hook qui bloque le scroll du body quand `enabled` est true. Restaure
 * la valeur originale + la scroll position au unmount ou quand enabled
 * repasse false.
 *
 * Pourquoi `position: fixed` et pas juste `overflow: hidden` :
 *   Sur iOS PWA standalone, `overflow: hidden` ne suffit PAS à bloquer
 *   le scroll. iOS continue à scroller le body quand un input focused
 *   reçoit un keydown, ce qui pousse les modals fixed au-dessus du
 *   viewport visible (cause des bugs "le composer saute / le contenu
 *   ne reste pas fixe au clavier"). `position: fixed` + sauvegarde
 *   `top: -scrollY` règle le problème.
 *
 * Préserve aussi `paddingRight` pour compenser la disparition de la
 * scrollbar desktop (évite un layout shift visible). */
export function useBodyScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof document === "undefined") return;

    const body = document.body;
    const scrollY = window.scrollY;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    const previous = {
      overflow: body.style.overflow,
      position: body.style.position,
      width: body.style.width,
      top: body.style.top,
      paddingRight: body.style.paddingRight,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.width = "100%";
    body.style.top = `-${scrollY}px`;
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = previous.overflow;
      body.style.position = previous.position;
      body.style.width = previous.width;
      body.style.top = previous.top;
      body.style.paddingRight = previous.paddingRight;
      /* Restore scroll position (sinon Safari scroll au top quand on
         remet position:static). */
      window.scrollTo(0, scrollY);
    };
  }, [enabled]);
}
