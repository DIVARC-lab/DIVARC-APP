"use client";

import { useEffect, useRef } from "react";

/* Hook qui piège le focus à l'intérieur d'un container quand `enabled`
 * est true. Tab/Shift+Tab cycle uniquement entre les éléments focusables
 * du container.
 *
 * Au mount : déplace le focus sur le premier élément focusable.
 * Au unmount : restaure le focus sur l'élément qui avait le focus avant.
 *
 * Usage :
 *   const ref = useFocusTrap<HTMLDivElement>(modalOpen);
 *   return <div ref={ref}>...</div>;
 *
 * Note : pas de dépendance `focus-trap-react` (200KB+). Implémentation
 * minimale qui couvre les cas a11y standards : Tab cycle + Escape (géré
 * par le caller) + restore focus. */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(",");

export function useFocusTrap<T extends HTMLElement>(enabled: boolean) {
  const containerRef = useRef<T>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    /* Capture l'élément focusé au moment de l'ouverture pour le restaurer
       à la fermeture (a11y best practice). */
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    /* Focus le premier focusable du container (souvent le bouton X
       ou le premier input). Si aucun n'est trouvé, focus le container
       lui-même via tabindex="-1" forcé. */
    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => el.offsetParent !== null);

    if (focusables.length > 0) {
      focusables[0]!.focus();
    } else {
      container.setAttribute("tabindex", "-1");
      container.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const refreshed = Array.from(
        container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);
      if (refreshed.length === 0) {
        event.preventDefault();
        return;
      }
      const first = refreshed[0]!;
      const last = refreshed[refreshed.length - 1]!;
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !container!.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !container!.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      /* Restaure le focus sur l'élément précédemment focusé. */
      if (previouslyFocusedRef.current) {
        try {
          previouslyFocusedRef.current.focus();
        } catch {
          /* L'élément n'existe peut-être plus dans le DOM. */
        }
      }
    };
  }, [enabled]);

  return containerRef;
}
