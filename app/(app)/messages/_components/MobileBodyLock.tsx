"use client";

import { useEffect } from "react";

/* Mode "WhatsApp" pour la conversation mobile :
 *
 *  1. Lock le scroll du body (`position: fixed`) pour qu'iOS ne puisse
 *     pas scroller la page hors écran quand le clavier ouvre.
 *  2. Ajoute la class `html.conv-fullscreen` qui cache la TopBar globale
 *     et la MobileBottomNav (via CSS dans globals.css) — la conv prend
 *     ainsi 100% du viewport visuel comme WhatsApp / Messenger.
 *  3. Au unmount : restore complet (body styles + scroll position +
 *     class) pour que l'user retombe pile sur la liste des conv là où
 *     il était.
 *
 *  Effet combiné avec --viewport-visual-h (cf. MobileViewportHeight) :
 *  - ChatHeader collé en haut (avec safe-area-top intégré)
 *  - MessageThread scroll en interne
 *  - Composer collé au-dessus du clavier (le conteneur shrink avec
 *    visualViewport.height en temps réel)
 *  - Aucun scroll possible du body */
export function MobileBodyLock() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    if (!isMobile) return;

    const html = document.documentElement;
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
    html.classList.add("conv-fullscreen");

    return () => {
      body.style.overflow = previous.overflow;
      body.style.position = previous.position;
      body.style.width = previous.width;
      body.style.top = previous.top;
      html.classList.remove("conv-fullscreen");
      window.scrollTo(0, scrollY);
    };
  }, []);

  return null;
}
