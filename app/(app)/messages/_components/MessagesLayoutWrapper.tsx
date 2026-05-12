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
     - Sur /messages (sidebar visible mobile) : 100dvh - 56px TopBar -
       56px BottomNav - safe-area-bottom (clamp 12px)
     - Sur /messages/<id> mobile (chat visible) : 100dvh - 56px TopBar.
       Pas de soustraction safe-area ici : le composer applique sa propre
       pb safe-area en interne, ce qui donne une transition au clavier
       beaucoup plus douce (le composer suit naturellement le bas du dvh
       qui rétrécit avec le clavier iOS).
     - Sur desktop (lg+) : 100dvh - 56px TopBar (BottomNav cachée par défaut) */
  const heightClass = isConvOpen
    ? "h-[calc(100dvh-56px)] lg:h-[calc(100dvh-56px)]"
    : "h-[calc(100dvh-56px-56px-min(env(safe-area-inset-bottom,0px),12px))] lg:h-[calc(100dvh-56px)]";

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
