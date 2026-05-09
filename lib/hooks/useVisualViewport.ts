"use client";

import { useEffect, useState } from "react";

/* Track la hauteur du clavier virtuel mobile via visualViewport API.
 * Renvoie le delta entre window.innerHeight et visualViewport.height,
 * ce qui correspond à la hauteur du clavier ouvert (positif quand
 * keyboard visible, 0 sinon).
 *
 * Sur desktop ou navigateurs sans visualViewport, renvoie toujours 0.
 *
 * Usage :
 *   const keyboardOffset = useKeyboardInset();
 *   <div style={{ paddingBottom: keyboardOffset }}>...</div>
 */
export function useKeyboardInset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    function update() {
      if (!vv) return;
      /* Le clavier réduit visualViewport.height. Le delta avec
         window.innerHeight = hauteur clavier (approx, peut inclure
         barre URL qui se hide en scroll mobile). */
      const next = Math.max(0, window.innerHeight - vv.height);
      setOffset(next);
    }

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return offset;
}
