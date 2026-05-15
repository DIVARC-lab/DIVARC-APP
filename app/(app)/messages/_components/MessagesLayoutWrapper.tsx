"use client";

/* Wrapper client pour la layout messages : sur mobile (<lg, c'est-à-dire
 * <1024px), on affiche SOIT la sidebar (sur /messages) SOIT le chat (sur
 * /messages/[id]) — pas les deux. Sur desktop (>=lg) les deux côte à côte.
 *
 * Hauteur : 100dvh - 56px (TopBar) sur desktop ; sur mobile en plus -
 * 56px (BottomNav). On utilise dvh pour gérer correctement la barre
 * d'URL Safari qui change la viewport. */

import { usePathname } from "next/navigation";

type Props = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
};

export function MessagesLayoutWrapper({ sidebar, children }: Props) {
  const pathname = usePathname();
  /* Une conv est ouverte si la route a un id (i.e. /messages/<uuid>). On
     match aussi les sous-routes /security et /settings. */
  const isConvOpen =
    pathname.startsWith("/messages/") && pathname !== "/messages";

  /* Hauteur du conteneur :
     - `var(--viewport-visual-h, 100dvh)` = vraie hauteur visible iOS
       PWA (réagit au clavier via visualViewport API, posée par
       <MobileViewportHeight/>). Fallback 100dvh hors PWA / desktop.
     - 56px TopBar + env(safe-area-inset-top) [notch iOS PWA] consommés
       par le padding-top du wrapper (app)/layout.
     - Sur /messages (sidebar visible mobile) : on retire en plus 56px
       BottomNav + safe-area-bottom (clamp 12px).
     - Sur /messages/<id> mobile (chat visible) : pas de soustraction
       safe-area-bottom ici (le composer applique sa propre pb).
     - Sur desktop (lg+) : pas de safe-area-top (pas iOS PWA), pas de
       BottomNav. */
  const heightClass = isConvOpen
    ? "h-[calc(var(--viewport-visual-h,100dvh)-56px-env(safe-area-inset-top,0px))] lg:h-[calc(100dvh-56px)]"
    : "h-[calc(var(--viewport-visual-h,100dvh)-56px-56px-env(safe-area-inset-top,0px)-min(env(safe-area-inset-bottom,0px),12px))] lg:h-[calc(100dvh-56px)]";

  return (
    <div
      className={`grid lg:grid-cols-[340px_1fr] overflow-hidden ${heightClass}`}
    >
      <aside
        className={
          isConvOpen
            ? "hidden lg:flex lg:flex-col min-h-0"
            : "flex flex-col min-h-0"
        }
      >
        {sidebar}
      </aside>
      <section
        className={
          isConvOpen
            ? "flex flex-col bg-bg overflow-hidden min-h-0"
            : "hidden lg:flex lg:flex-col bg-bg overflow-hidden min-h-0"
        }
      >
        {children}
      </section>
    </div>
  );
}
