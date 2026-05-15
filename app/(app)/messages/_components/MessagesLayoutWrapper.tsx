"use client";

/* Wrapper client pour la layout messages.
 *
 * Mobile (<lg = 1024px) :
 *  - Layout `flex flex-col` simple (PAS grid : avec grid sans
 *    grid-template-rows explicite, la row a hauteur auto = contenu,
 *    ce qui casse le flex-1 de ConversationView en interne).
 *  - On affiche SOIT la sidebar (sur /messages) SOIT le chat (sur
 *    /messages/[id]) — pas les deux. L'élément visible prend flex-1.
 *  - En conv mobile : pattern "WhatsApp", layout IN-FLOW (pas fixed)
 *    de hauteur var(--viewport-visual-h) qui suit le clavier en
 *    temps réel via visualViewport. TopBar/BottomNav cachées par
 *    `html.conv-fullscreen` (cf. MobileBodyLock + globals.css), shell
 *    pt/pb retirés en conv-fullscreen, main min-h fixée par CSS.
 *
 *    On évite `position: fixed inset-0` : iOS Safari en mode PWA a
 *    un bug avec les éléments `fixed` à l'intérieur d'un ancêtre
 *    `overflow: hidden` (cf. `<main>` qui a `overflow-x: hidden`)
 *    qui les rendait invisibles.
 *
 * Desktop (>=lg) :
 *  - Layout `grid grid-cols-[340px_1fr]` : sidebar + chat side-by-side.
 *  - Pas de fullscreen ni body lock : la TopBar reste visible. */

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

  const containerClass = isConvOpen
    ? /* Conv ouverte : mobile in-flow flex-col plein écran visible
         (le shell parent a déjà pt:0 / pb:0 via .conv-fullscreen),
         desktop grid normal. */
      "flex flex-col h-[var(--viewport-visual-h,100dvh)] overflow-hidden lg:grid lg:grid-cols-[340px_1fr] lg:h-[calc(100dvh-56px)]"
    : /* Liste de conv : flex column mobile pour que la sidebar prenne
         toute la hauteur via flex-1, grid sur desktop. */
      "flex flex-col overflow-hidden lg:grid lg:grid-cols-[340px_1fr] h-[calc(var(--viewport-visual-h,100dvh)-56px-56px-env(safe-area-inset-top,0px)-min(env(safe-area-inset-bottom,0px),12px))] lg:h-[calc(100dvh-56px)]";

  return (
    <div className={containerClass}>
      <aside
        className={
          isConvOpen
            ? /* Cachée en mobile (conv visible à la place), visible
                 desktop dans la 1ère col du grid. */
              "hidden lg:flex lg:flex-col min-h-0"
            : /* Visible en mobile (flex-1 prend toute la hauteur du
                 parent flex-col), passe en grid item sur desktop. */
              "flex-1 min-h-0 flex flex-col lg:flex-initial"
        }
      >
        {sidebar}
      </aside>
      <section
        className={
          isConvOpen
            ? /* Visible en mobile (flex-1 prend toute la hauteur du
                 parent flex-col), passe en grid item sur desktop. */
              "flex-1 min-h-0 flex flex-col bg-bg overflow-hidden lg:flex-initial"
            : /* Cachée en mobile (sidebar visible à la place), visible
                 desktop dans la 2e col du grid. */
              "hidden lg:flex lg:flex-col bg-bg overflow-hidden min-h-0"
        }
      >
        {children}
      </section>
    </div>
  );
}
