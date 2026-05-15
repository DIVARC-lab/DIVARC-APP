"use client";

import { useEffect } from "react";

/* Bloque le scroll du body en mode mobile pour la vue conversation.
 *
 * Pourquoi : sur iOS PWA, quand l'input prend focus et que le clavier
 * apparaît, iOS tente de "scroll into view" le focused input. Comme
 * le wrapper (app) a `min-h-dvh` (= la hauteur viewport sans clavier),
 * il est plus grand que la zone visible avec clavier ouvert. iOS
 * scrolle alors le body pour amener l'input visible — ce qui pousse
 * tout le reste (ChatHeader, messages) hors écran par le haut.
 *
 * Avec body en `position: fixed`, le body NE PEUT PLUS scroller. iOS
 * n'a pas le choix : l'input doit rester à sa position dans le flow
 * (qui, grâce à --viewport-visual-h, est juste au-dessus du clavier).
 * ChatHeader reste visible en haut. Composer reste collé au-dessus
 * du clavier. Tout marche.
 *
 * Restore complet au unmount : on remet le body comme on l'a trouvé
 * et on restaure la scroll position pour que l'user retombe sur la
 * liste des conversations là où il était. */
export function MobileBodyLock() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    /* Seulement en mobile (<lg = 1024px). Sur desktop, le layout est
       split sidebar + chat, pas de problème de clavier. */
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    if (!isMobile) return;

    const body = document.body;
    const scrollY = window.scrollY;
    const previous = {
      overflow: body.style.overflow,
      position: body.style.position,
      width: body.style.width,
      top: body.style.top,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.width = "100%";
    body.style.top = `-${scrollY}px`;

    return () => {
      body.style.overflow = previous.overflow;
      body.style.position = previous.position;
      body.style.width = previous.width;
      body.style.top = previous.top;
      window.scrollTo(0, scrollY);
    };
  }, []);

  return null;
}
