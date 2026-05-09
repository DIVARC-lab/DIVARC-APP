"use client";

import { Bell, MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

/* TopBarMobile — variante mobile (< lg) du TopBar. Logo seul (sans
 * wordmark) + titre de page courante + 3 actions ronds (Search overlay,
 * Messages, Notifications).
 *
 * Pas d'onglets centraux mobile — ils sont dans la BottomNav. */

const PAGE_TITLES: Record<string, string> = {
  "/feed": "Accueil",
  "/network": "Amis",
  "/friends": "Amis",
  "/explore": "Découvrir",
  "/marketplace": "Marché",
  "/jobs": "Emploi",
  "/messages": "Discussions",
  "/notifications": "Notifications",
  "/wallet": "Wallet",
  "/profile": "Profil",
  "/settings": "Paramètres",
  "/circles": "Cercles",
  "/stories/new": "Nouvelle story",
  "/create": "Créer",
};

function findTitle(pathname: string): string {
  /* Match exact d'abord, puis match par préfixe pour les routes dynamiques. */
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(prefix + "/")) return title;
  }
  return "DIVARC";
}

type Props = {
  unreadNotifications?: number;
  unreadMessages?: number;
};

export function TopBarMobile({
  unreadNotifications = 0,
  unreadMessages = 0,
}: Props) {
  const pathname = usePathname();
  const title = findTitle(pathname);

  return (
    <div className="flex items-center justify-between gap-3 h-full px-4">
      <Link
        href="/feed"
        className="flex items-center gap-2.5 min-w-0"
        aria-label="DIVARC accueil"
      >
        <Logo size={32} />
        <span className="font-display italic text-[16px] text-night leading-none truncate">
          {title}
        </span>
      </Link>
      <div className="flex items-center gap-1.5 shrink-0">
        <MobileActionButton
          href="/search"
          label="Recherche"
          icon={Search}
        />
        <MobileActionButton
          href="/messages"
          label="Discussions"
          icon={MessageCircle}
          badgeCount={unreadMessages}
        />
        <MobileActionButton
          href="/notifications"
          label="Notifications"
          icon={Bell}
          badgeCount={unreadNotifications}
        />
      </div>
    </div>
  );
}

function MobileActionButton({
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
      className="relative w-9 h-9 rounded-full bg-bg-soft hover:bg-cream text-night flex items-center justify-center transition-colors"
    >
      <Icon className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden />
      {badgeCount > 0 ? (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-gold text-night text-[10px] font-bold flex items-center justify-center"
        >
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      ) : null}
    </Link>
  );
}
