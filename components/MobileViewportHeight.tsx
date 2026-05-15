"use client";

import { useEffect } from "react";

/* Sync de la hauteur du viewport VISUEL iOS PWA en CSS var.
 *
 * Pourquoi : `100dvh` change avec la URL bar Safari MAIS PAS avec le
 * clavier en PWA standalone iOS. Quand le clavier ouvre :
 *   - dvh garde l'ancienne valeur
 *   - le conteneur messages dépasse derrière le clavier
 *   - iOS scroll le body pour amener l'input visible
 *   - ChatHeader sort par le haut + composer flotte mal positionné
 *
 * Fix : on écoute `visualViewport.resize` et on expose la VRAIE hauteur
 * visible en CSS var `--viewport-visual-h`. Les composants critiques
 * (MessagesLayoutWrapper) l'utilisent à la place de `100dvh` quand
 * disponible.
 *
 * Coût : 1 listener resize passive + 1 style.setProperty par event.
 * Aucun re-render React.
 *
 * Fallback gracieux : si l'API n'existe pas, on ne fait rien et le CSS
 * tombe sur la valeur dvh par défaut (var(--viewport-visual-h, 100dvh)). */
export function MobileViewportHeight() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    let rafId: number | null = null;
    let pendingHeight: number | null = null;

    function applyHeight() {
      rafId = null;
      if (pendingHeight !== null) {
        root.style.setProperty(
          "--viewport-visual-h",
          `${pendingHeight}px`,
        );
        pendingHeight = null;
      }
    }

    function update() {
      if (!vv) return;
      pendingHeight = vv.height;
      if (rafId === null) {
        rafId = requestAnimationFrame(applyHeight);
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
    };
  }, []);

  return null;
}
