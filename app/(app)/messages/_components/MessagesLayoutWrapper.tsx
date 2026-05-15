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
     - Sur /messages/<id> mobile (chat visible) : pattern "WhatsApp".
       Le wrapper se positionne en `fixed inset-0` et prend
       `var(--viewport-visual-h, 100dvh)` (réagit au clavier en temps
       réel via visualViewport). TopBar globale + BottomNav cachées
       par html.conv-fullscreen (cf. MobileBodyLock + globals.css),
       donc plus aucune soustraction à faire ici. Sur desktop : grid
       classique sidebar+chat.
     - Sur /messages (sidebar mobile pleine page) : layout normal dans
       le flow, on retire TopBar (56 + safe-area-top) + BottomNav
       (56 + safe-area-bottom clamp 12). */
  const containerClass = isConvOpen
    ? "fixed inset-0 z-30 grid h-[var(--viewport-visual-h,100dvh)] overflow-hidden lg:relative lg:inset-auto lg:z-auto lg:grid-cols-[340px_1fr] lg:h-[calc(100dvh-56px)]"
    : "grid overflow-hidden lg:grid-cols-[340px_1fr] h-[calc(var(--viewport-visual-h,100dvh)-56px-56px-env(safe-area-inset-top,0px)-min(env(safe-area-inset-bottom,0px),12px))] lg:h-[calc(100dvh-56px)]";

  return (
    <div className={containerClass}>
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
