"use client";

import {
  Bell,
  Briefcase,
  Compass,
  Grid3x3,
  Home,
  MessageCircle,
  Search,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/Logo";
import { useHideOnScroll } from "@/lib/hooks/useHideOnScroll";
import { cn } from "@/lib/utils/cn";
import { TopBarMobile } from "./TopBarMobile";

/* TopBar — composant racine desktop ET mobile, monté UNE fois dans
 * (app)/layout.tsx. Détermine son layout via media queries CSS, pas via
 * detection JS (= pas de FOUC, pas de hydration mismatch).
 *
 * Adaptations :
 *  - Desktop ≥ 1024px : 3 zones (logo+search / 5 onglets centraux / actions)
 *  - Mobile < 1024px : layout simplifié (logo + page title + 3 actions)
 *
 * Hide-on-scroll : pattern Facebook mobile, fonctionne aussi sur desktop
 * en mode "petit écran" (tablette).
 *
 * Couleurs : palette DIVARC (validée par user). Bordure-bas active = gold,
 * pas bleu Facebook. */

const PRIMARY_TABS: Array<{
  href: string;
  label: string;
  icon: typeof Home;
  matchPaths?: string[];
}> = [
  {
    href: "/feed",
    label: "Accueil",
    icon: Home,
    matchPaths: ["/feed", "/feed/"],
  },
  {
    href: "/network",
    label: "Amis",
    icon: Users,
    matchPaths: ["/network", "/friends"],
  },
  {
    href: "/explore",
    label: "Découvrir",
    icon: Compass,
    matchPaths: ["/explore", "/discover"],
  },
  {
    href: "/marketplace",
    label: "Marché",
    icon: Store,
    matchPaths: ["/marketplace"],
  },
  {
    href: "/jobs",
    label: "Emploi",
    icon: Briefcase,
    matchPaths: ["/jobs"],
  },
];

type TopBarProps = {
  /** Données utilisateur courant pour les actions à droite. Vient du
      server layout via createClient + getCurrentProfile. */
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  /** Compteurs non-lus pour les badges sur Bell + MessageCircle. */
  unreadNotifications?: number;
  unreadMessages?: number;
};

export function TopBar(props: TopBarProps) {
  const hidden = useHideOnScroll(80);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-14 bg-bg border-b border-line transition-transform duration-200 ease-out",
        hidden && "-translate-y-full",
      )}
      aria-label="Navigation principale"
    >
      {/* Desktop : visible ≥ lg */}
      <div className="hidden lg:flex items-center h-full px-4 gap-4 max-w-screen-2xl mx-auto">
        <TopBarLeftDesktop />
        <TopBarTabs />
        <TopBarActionsDesktop {...props} />
      </div>
      {/* Mobile : visible < lg */}
      <div className="lg:hidden h-full">
        <TopBarMobile {...props} />
      </div>
    </header>
  );
}

/* --- Zone gauche desktop : logo + wordmark + search ---------------- */
function TopBarLeftDesktop() {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <Link href="/feed" className="flex items-center gap-2.5" aria-label="DIVARC accueil">
        <Logo size={36} />
        <span className="font-display italic text-[18px] text-night leading-none">
          DIVARC
        </span>
      </Link>
      <DesktopSearchBar />
    </div>
  );
}

function DesktopSearchBar() {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className={cn(
        "relative flex items-center bg-bg-soft rounded-full transition-all duration-150",
        focused ? "w-[320px]" : "w-[240px]",
      )}
    >
      <Search
        className="absolute left-3 w-4 h-4 text-muted pointer-events-none"
        aria-hidden
      />
      <input
        type="search"
        placeholder="Rechercher sur DIVARC"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full h-10 pl-10 pr-14 bg-transparent rounded-full text-[14px] text-night placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold/40"
      />
      <kbd className="absolute right-3 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-line bg-white text-[10px] font-semibold text-muted pointer-events-none">
        ⌘K
      </kbd>
    </div>
  );
}

/* --- Zone centre : 5 onglets icônes (desktop only) ---------------- */
function TopBarTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation primaire"
      className="flex-1 flex items-center justify-center gap-2 max-w-2xl"
    >
      {PRIMARY_TABS.map((tab) => {
        const Icon = tab.icon;
        const active =
          tab.matchPaths?.some((p) => pathname.startsWith(p)) ?? false;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            aria-label={tab.label}
            className={cn(
              /* Bouton ~112×48px, hauteur full TopBar (h-14 - padding) pour
                 que la bordure-bas active touche le bord bas de la TopBar
                 (signature FB / DIVARC). */
              "relative flex items-center justify-center w-[112px] h-[48px] rounded-lg transition-colors",
              active
                ? "text-night"
                : "text-night-dim hover:bg-bg-soft hover:text-night",
            )}
          >
            <Icon
              className="w-6 h-6"
              strokeWidth={active ? 2.4 : 2}
              aria-hidden
            />
            {active ? (
              /* Bordure-bas gold 3px, signature DIVARC (jamais bleue FB).
                 Positionnée en bas du bouton, alignée avec border-line de
                 la TopBar pour un effet de surlignage. */
              <span
                aria-hidden
                className="absolute -bottom-[5px] left-2 right-2 h-[3px] rounded-t-full bg-gold"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/* --- Zone droite desktop : 4 boutons ronds (Menu / Messages / Bell / Avatar) */
function TopBarActionsDesktop({
  userId,
  fullName,
  avatarUrl,
  unreadNotifications = 0,
  unreadMessages = 0,
}: TopBarProps) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <RoundActionButton href="/explore" label="Toutes les apps" icon={Grid3x3} />
      <RoundActionButton
        href="/messages"
        label="Discussions"
        icon={MessageCircle}
        badgeCount={unreadMessages}
      />
      <RoundActionButton
        href="/notifications"
        label="Notifications"
        icon={Bell}
        badgeCount={unreadNotifications}
      />
      <Link
        href="/profile"
        aria-label={`Profil de ${fullName ?? "moi"}`}
        className="ml-1 shrink-0 ring-2 ring-transparent hover:ring-gold/30 rounded-full transition-all"
      >
        <Avatar
          src={avatarUrl}
          fullName={fullName}
          size="sm"
        />
      </Link>
      <span className="sr-only">{userId}</span>
    </div>
  );
}

function RoundActionButton({
  href,
  label,
  icon: Icon,
  badgeCount = 0,
}: {
  href: string;
  label: string;
  icon: typeof Bell;
  badgeCount?: number;
}) {
  return (
    <Link
      href={href}
      aria-label={
        badgeCount > 0 ? `${label} — ${badgeCount} non-lu${badgeCount > 1 ? "s" : ""}` : label
      }
      className="relative w-10 h-10 rounded-full bg-bg-soft hover:bg-cream text-night flex items-center justify-center transition-colors"
    >
      <Icon className="w-5 h-5" strokeWidth={2} aria-hidden />
      {badgeCount > 0 ? (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-night text-[11px] font-bold flex items-center justify-center"
        >
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      ) : null}
    </Link>
  );
}
