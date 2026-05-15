"use client";

import { useEffect } from "react";

/* Sync de la zone visible iOS PWA (visualViewport) en CSS vars.
 *
 * Pourquoi : iOS PWA gère le clavier de deux façons (selon version) :
 *  - Avec `interactive-widget=resizes-content` (iOS 17.4+) : le LAYOUT
 *    viewport rétrécit avec le clavier, donc `100dvh` reflète bien la
 *    zone visible. visualViewport.offsetTop reste à 0.
 *  - Sans (iOS <17 ou comportement par défaut) : seule la zone visuelle
 *    rétrécit, le layout viewport reste plein écran. iOS DÉCALE alors
 *    le visualViewport vers le BAS (offsetTop > 0) pour amener
 *    l'input visible. Conséquence : le contenu in-flow (à layout y=0)
 *    n'est plus dans la zone visible.
 *
 * On expose deux CSS vars que MessagesLayoutWrapper utilise :
 *  --viewport-visual-h        : hauteur visible (= visualViewport.height)
 *  --viewport-visual-offset-top : décalage iOS (= visualViewport.offsetTop)
 *
 * Le wrapper messages applique :
 *  - height = --viewport-visual-h  (le wrapper fait la taille visible)
 *  - margin-top = --viewport-visual-offset-top  (le wrapper suit le
 *    décalage iOS et reste aligné sur la zone visible)
 *
 * Effet : ChatHeader collé en haut du visible, composer collé en bas
 * (juste au-dessus du clavier), peu importe la version iOS.
 *
 * Coût : 1 listener resize + 1 listener scroll passifs sur visualViewport,
 * rAF throttle, 2 style.setProperty par event. Zéro re-render React. */
export function MobileViewportHeight() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    let rafId: number | null = null;

    function applyAll() {
      rafId = null;
      if (!vv) return;
      root.style.setProperty("--viewport-visual-h", `${vv.height}px`);
      root.style.setProperty(
        "--viewport-visual-offset-top",
        `${vv.offsetTop}px`,
      );
    }

    function update() {
      if (rafId === null) {
        rafId = requestAnimationFrame(applyAll);
      }
    }

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      if (rafId !== null) cancelAnimationFrame(rafId);
      root.style.removeProperty("--viewport-visual-h");
      root.style.removeProperty("--viewport-visual-offset-top");
    };
  }, []);

  return null;
}
