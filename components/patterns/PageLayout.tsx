/* DIVARC — Design System Structurel · Étape 10
 *
 * <PageLayout> — squelette commun à toutes les pages.
 *
 * 6 variants :
 *   - feed       : sidebar gauche + center 680px + right rail (Feed, Cercle)
 *   - split      : sidebar gauche large + center pleine largeur (Messages)
 *   - standard   : center 1100px max (Profil, Notifications, Settings…)
 *   - wide       : center 1280px (Marketplace, Jobs)
 *   - narrow     : center 480px (Login, Signup, Settings simples)
 *   - fullbleed  : pleine largeur sans container (Reels immersif)
 *
 * Toutes les pages DIVARC DOIVENT utiliser ce composant. Le seul
 * endroit où on choisit la largeur de page.
 *
 * Note : on ne gère PAS la BottomNav mobile ici — elle est déjà dans
 * le layout root via `app/(app)/layout.tsx`. PageLayout ajoute juste
 * un padding-bottom suffisant sur mobile pour ne pas être masqué.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Container } from "../primitives/Container";
import {
  CONTAINER_WIDTHS,
  type ContainerWidth,
} from "@/lib/design/layout";
import { spacing, type SpacingToken } from "@/lib/design/spacing";

export type PageLayoutVariant =
  | "feed"
  | "split"
  | "standard"
  | "wide"
  | "narrow"
  | "fullbleed";

type PageLayoutProps = {
  variant?: PageLayoutVariant;
  /* Sticky en haut. Pas obligatoire — certaines pages ont leur propre
     header inline (ex: Messages avec conv-header). */
  header?: ReactNode;
  leftSidebar?: ReactNode;
  rightRail?: ReactNode;
  /* Padding vertical du contenu principal. Défaut : '2xl' top, '4xl' bottom.
     'none' pour pleine maîtrise. */
  paddingTop?: SpacingToken | "none";
  paddingBottom?: SpacingToken | "none";
  /* Background de page. Défaut transparent (hérite du layout root). */
  background?: "default" | "bg-soft" | "bg-deep" | "cream";
  className?: string;
  children: ReactNode;
};

const BG_VAR: Record<NonNullable<PageLayoutProps["background"]>, string> = {
  default: "transparent",
  "bg-soft": "var(--color-bg-soft)",
  "bg-deep": "var(--color-bg-deep)",
  cream: "var(--color-cream)",
};

export function PageLayout({
  variant = "standard",
  header,
  leftSidebar,
  rightRail,
  paddingTop = "2xl",
  paddingBottom = "4xl",
  background = "default",
  className,
  children,
}: PageLayoutProps) {
  const ptStyle = paddingTop === "none" ? 0 : spacing[paddingTop];
  const pbStyle = paddingBottom === "none" ? 0 : spacing[paddingBottom];
  const bgStyle = BG_VAR[background];

  /* === FEED — sidebar G + center 680 + right rail (desktop xl) === */
  if (variant === "feed") {
    return (
      <div
        className={cn("min-h-screen", className)}
        style={{ background: bgStyle }}
      >
        {header}
        <div className="flex gap-6 max-w-7xl mx-auto px-4 lg:px-6">
          {leftSidebar ? (
            <aside className="hidden xl:block xl:w-72 xl:shrink-0 xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto">
              {leftSidebar}
            </aside>
          ) : null}
          <main
            className="flex-1 min-w-0 mx-auto"
            style={{
              maxWidth: CONTAINER_WIDTHS.text,
              paddingTop: ptStyle,
              paddingBottom: pbStyle,
            }}
          >
            {children}
          </main>
          {rightRail ? (
            <aside className="hidden xl:block xl:w-80 xl:shrink-0 xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto">
              {rightRail}
            </aside>
          ) : null}
        </div>
      </div>
    );
  }

  /* === SPLIT — sidebar large (liste) + center (détail) — Messages === */
  if (variant === "split") {
    return (
      <div
        className={cn("min-h-screen flex", className)}
        style={{ background: bgStyle }}
      >
        {leftSidebar ? (
          <aside className="w-full lg:w-96 lg:shrink-0 lg:border-r lg:border-line">
            {leftSidebar}
          </aside>
        ) : null}
        <main className="flex-1 min-w-0 flex flex-col">
          {header}
          <div className="flex-1 min-h-0">{children}</div>
        </main>
      </div>
    );
  }

  /* === STANDARD — center 1100 === */
  if (variant === "standard") {
    return (
      <div
        className={cn("min-h-screen", className)}
        style={{ background: bgStyle }}
      >
        {header}
        <Container
          maxWidth="default"
          as="main"
          paddingX="page"
        >
          <div style={{ paddingTop: ptStyle, paddingBottom: pbStyle }}>
            {children}
          </div>
        </Container>
      </div>
    );
  }

  /* === WIDE — center 1280 (marketplace) === */
  if (variant === "wide") {
    return (
      <div
        className={cn("min-h-screen", className)}
        style={{ background: bgStyle }}
      >
        {header}
        <Container maxWidth="wide" as="main" paddingX="page">
          <div style={{ paddingTop: ptStyle, paddingBottom: pbStyle }}>
            {children}
          </div>
        </Container>
      </div>
    );
  }

  /* === NARROW — center 480 (login, forms) === */
  if (variant === "narrow") {
    return (
      <div
        className={cn("min-h-screen flex items-center justify-center", className)}
        style={{ background: bgStyle }}
      >
        <Container
          maxWidth="narrow"
          as="main"
          paddingX="page"
        >
          <div style={{ paddingTop: ptStyle, paddingBottom: pbStyle }}>
            {children}
          </div>
        </Container>
      </div>
    );
  }

  /* === FULLBLEED — pleine largeur (Reels immersif) === */
  return (
    <div
      className={cn("min-h-screen w-full", className)}
      style={{ background: bgStyle }}
    >
      {header}
      {children}
    </div>
  );
}

/* === Sticky header helper ===
 *
 * Header collant en haut de page. Quand maxWidth/paddingX sont fournis,
 * un <Container> interne s'aligne automatiquement avec le main contenu.
 * Indispensable pour les pages où le sticky header doit matcher la largeur
 * du main (feed/quote, feed/new/article, feed/new/thread, marketplace/
 * messages/[id]).
 */

type PageStickyHeaderProps = {
  /* Solid (white + line) ou translucide (bg/85 + backdrop-blur, défaut). */
  variant?: "solid" | "translucent";
  /* Si fourni, ajoute un Container interne aligné avec le main. */
  maxWidth?: ContainerWidth | { mobile: ContainerWidth; tablet?: ContainerWidth; desktop: ContainerWidth };
  paddingX?: "page" | "none" | SpacingToken;
  className?: string;
  children: ReactNode;
};

export function PageStickyHeader({
  variant = "translucent",
  maxWidth,
  paddingX,
  className,
  children,
}: PageStickyHeaderProps) {
  const bgClass =
    variant === "solid"
      ? "bg-bg border-b border-line"
      : "bg-bg/85 backdrop-blur-md border-b border-line/60";

  const wrapper = maxWidth ? (
    <Container maxWidth={maxWidth} paddingX={paddingX ?? "page"}>
      {children}
    </Container>
  ) : (
    children
  );

  return (
    <div
      className={cn("sticky top-0", bgClass, className)}
      /* `isolation: isolate` crée un stacking context scope, isole le
         z-index du sticky pour qu'il ne soit pas dépassé par des fixed
         enfants dans le contenu (CTA bottom, FAB). */
      style={{ zIndex: 20, isolation: "isolate" }}
    >
      {wrapper}
    </div>
  );
}
