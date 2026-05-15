"use client";

/**
 * MobileBottomNav — refonte étape 7 style Facebook mobile.
 *
 * Style FB :
 * - Position fixed bottom-0, pleine largeur, bg-surface (white pas navy
 *   flottant), border-top, hauteur 56px + safe-area-inset-bottom
 * - 5 onglets égalitaires, indicateur ACTIF = bordure-bas 3px gold
 *   (signature DIVARC, jamais bleue FB)
 * - Tap feedback bg-bg-soft 200ms
 *
 * 5 onglets selon plan validé (Reels remplacé par Découvrir) :
 *  1. Accueil   → /feed
 *  2. Amis      → /friends
 *  3. Découvrir → /explore
 *  4. Notifs    → /notifications (badge compteur)
 *  5. Menu      → ouvre MobileMenuSheet (étape 8)
 */
import {
  Bell,
  Compass,
  Home,
  Menu as MenuIcon,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { MobileMenuSheet } from "./layout/MobileMenuSheet";

type Item = {
  href?: string;
  label: string;
  icon: LucideIcon;
  match?: (path: string) => boolean;
  /** Si défini, override le href par un onClick (ex : ouvre le sheet menu). */
  trigger?: "menu";
  badgeKey?: "notifications" | "messages";
};

const ITEMS: ReadonlyArray<Item> = [
  {
    href: "/feed",
    label: "Accueil",
    icon: Home,
    match: (p) => p === "/feed" || p === "/dashboard" || p === "/",
  },
  {
    href: "/friends",
    label: "Amis",
    icon: Users,
    match: (p) => p.startsWith("/friends") || p.startsWith("/network"),
  },
  {
    href: "/explore",
    label: "Découvrir",
    icon: Compass,
    match: (p) => p.startsWith("/explore") || p.startsWith("/search"),
  },
  {
    href: "/notifications",
    label: "Notifs",
    icon: Bell,
    match: (p) => p.startsWith("/notifications"),
    badgeKey: "notifications",
  },
  {
    label: "Menu",
    icon: MenuIcon,
    trigger: "menu",
  },
];

const HIDDEN_PREFIXES = [
  "/stories/",
  "/login",
  "/signup",
  "/welcome",
  "/invite/",
  "/create",
];

type MobileBottomNavProps = {
  unreadNotifications?: number;
  unreadMessages?: number;
  fullName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
};

export function MobileBottomNav({
  unreadNotifications = 0,
  unreadMessages = 0,
  fullName = null,
  username = null,
  avatarUrl = null,
}: MobileBottomNavProps) {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  /* Pattern WhatsApp : on cache la BottomNav quand l'utilisateur est dans
     une conversation (route /messages/<id> ou sous-routes), pour donner
     la place à la zone d'écriture fixe + éviter le gros gap quand le
     clavier iOS apparaît. La page /messages racine garde la nav. */
  if (pathname.startsWith("/messages/") && pathname !== "/messages") return null;

  return (
    <>
      <nav
        data-mobile-bottom-nav
        aria-label="Navigation principale"
        /* Clamp la safe-area à max 12px : sur iPhone Pro avec 34px de
           home indicator zone, le menu paraissait flotter trop haut
           (UX peu pro). 12px suffit à éviter le conflit avec le
           gesture du home indicator sans laisser de zone vide. */
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-bg border-t border-line shadow-[0_-2px_8px_rgba(10,31,68,0.04)] pb-[min(env(safe-area-inset-bottom,0px),12px)]"
      >
        <div className="flex h-14">
          {ITEMS.map((item, index) => {
            const active = item.match ? item.match(pathname) : false;
            const badge =
              item.badgeKey === "notifications"
                ? unreadNotifications
                : item.badgeKey === "messages"
                  ? unreadMessages
                  : 0;

            if (item.trigger === "menu") {
              return (
                <BottomNavTrigger
                  key={index}
                  active={menuOpen}
                  item={item}
                  badge={
                    /* Le bouton Menu peut afficher un badge si messages
                       non-lus (puisque Discussions n'est pas dans la nav
                       mobile principale). */
                    unreadMessages
                  }
                  onClick={() => setMenuOpen(true)}
                />
              );
            }
            return (
              <BottomNavLink
                key={item.href}
                active={active}
                item={item}
                badge={badge}
              />
            );
          })}
        </div>
      </nav>

      <MobileMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        fullName={fullName}
        username={username}
        avatarUrl={avatarUrl}
        unreadMessages={unreadMessages}
      />
    </>
  );
}

function BottomNavLink({
  active,
  item,
  badge,
}: {
  active: boolean;
  item: Item;
  badge: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href!}
      aria-current={active ? "page" : undefined}
      aria-label={
        badge > 0 ? `${item.label} — ${badge} non-lu${badge > 1 ? "s" : ""}` : item.label
      }
      className={cn(
        /* Bordure-bas active = signature DIVARC. On utilise un span absolute
           plutôt que border pour ne pas décaler le content. */
        "relative flex-1 flex flex-col items-center justify-center gap-1 min-h-[52px] active:bg-bg-soft transition-colors",
        active ? "text-night" : "text-night-dim",
      )}
    >
      <span className="relative">
        <Icon
          className="w-7 h-7"
          strokeWidth={active ? 2.4 : 2}
          aria-hidden
        />
        {badge > 0 ? (
          <span
            aria-hidden
            className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-night text-[11px] font-bold flex items-center justify-center"
          >
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "text-[11px] leading-none",
          active ? "font-bold" : "font-medium",
        )}
      >
        {item.label}
      </span>
      {active ? (
        <span
          aria-hidden
          className="absolute bottom-0 left-0 right-0 h-[3px] bg-gold"
        />
      ) : null}
    </Link>
  );
}

function BottomNavTrigger({
  active,
  item,
  badge,
  onClick,
}: {
  active: boolean;
  item: Item;
  badge: number;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={item.label}
      aria-expanded={active}
      className={cn(
        "relative flex-1 flex flex-col items-center justify-center gap-1 min-h-[52px] active:bg-bg-soft transition-colors",
        active ? "text-night" : "text-night-dim",
      )}
    >
      <span className="relative">
        <Icon className="w-7 h-7" strokeWidth={active ? 2.4 : 2} aria-hidden />
        {badge > 0 ? (
          <span
            aria-hidden
            className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-night text-[11px] font-bold flex items-center justify-center"
          >
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "text-[11px] leading-none",
          active ? "font-bold" : "font-medium",
        )}
      >
        {item.label}
      </span>
      {active ? (
        <span
          aria-hidden
          className="absolute bottom-0 left-0 right-0 h-[3px] bg-gold"
        />
      ) : null}
    </button>
  );
}
