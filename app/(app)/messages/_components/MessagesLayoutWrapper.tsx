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

  return (
    <div
      className="grid lg:grid-cols-[340px_1fr] overflow-hidden h-[calc(100dvh-56px-56px-env(safe-area-inset-bottom,0px))] lg:h-[calc(100dvh-56px)]"
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
