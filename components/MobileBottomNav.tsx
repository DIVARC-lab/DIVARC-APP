"use client";

/**
 * MobileBottomNav — pill flottante Bold (handoff feed-mobile-bold.jsx
 * BoldTabBar L162-187).
 *
 * Refonte audit S4 :
 * - Plus de bg-white border-t avec FAB central (ancienne version "Sage")
 * - Pill navy flottante : margin x-3.5 r-32 bg-night/96 backdrop-blur-xl
 *   shadow `0 24px 60px -16px rgba(10,31,68,0.5)`
 * - Padding 12/8, justify-around, 5 items plats
 * - Active : color gold + indicateur top -12 w22 h3 r2 gold avec glow
 *   `0 0 12px gold`
 * - Inactive : color cream/55, label weight 500 / actif weight 700
 * - Icon 20x20
 * - Position absolute bottom 0 paddingBottom 24 (env safe-area)
 *
 * 5 items adaptés à DIVARC (vs proto qui a Accueil/Découvrir/Feed/Msg/Profil) :
 * Accueil (feed) · Marché · Découvrir (explore) · Emploi · Profil.
 * Marché et Emploi sont les piliers fonctionnels DIVARC, on les garde.
 *
 * 100% Tailwind v4. Aucun style={{}} inline.
 */
import {
  Briefcase,
  Compass,
  Home,
  ShoppingBag,
  User,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
};

const ITEMS: ReadonlyArray<Item> = [
  {
    href: "/feed",
    label: "Accueil",
    icon: Home,
    match: (p) => p === "/feed" || p === "/dashboard" || p === "/",
  },
  {
    href: "/marketplace",
    label: "Marché",
    icon: ShoppingBag,
    match: (p) => p.startsWith("/marketplace"),
  },
  {
    href: "/explore",
    label: "Découvrir",
    icon: Compass,
    match: (p) => p.startsWith("/explore") || p.startsWith("/search"),
  },
  {
    href: "/jobs",
    label: "Emploi",
    icon: Briefcase,
    match: (p) => p.startsWith("/jobs"),
  },
  {
    href: "/profile",
    label: "Profil",
    icon: User,
    match: (p) => p.startsWith("/profile") || p.startsWith("/u/"),
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

export function MobileBottomNav() {
  const pathname = usePathname() ?? "";
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <div
      aria-hidden={false}
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none pb-[env(safe-area-inset-bottom,0px)]"
    >
      <nav
        aria-label="Navigation principale"
        className="pointer-events-auto mx-3.5 mb-3 rounded-[32px] bg-night/96 backdrop-blur-xl shadow-[0_24px_60px_-16px_rgba(10,31,68,0.5)] flex justify-around px-2 py-3 max-w-md"
      >
        {ITEMS.map((item) => (
          <BottomNavItem key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
    </div>
  );
}

function BottomNavItem({
  item,
  pathname,
}: {
  item: Item;
  pathname: string;
}) {
  const Icon = item.icon;
  const active = item.match(pathname);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-col items-center gap-[3px] min-w-[50px] py-1 transition-colors",
        active ? "text-gold" : "text-cream/55 hover:text-cream/85",
      )}
    >
      {/* Indicateur top -12 gold avec glow (proto BoldTabBar L180) */}
      {active ? (
        <span
          aria-hidden
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-[22px] h-[3px] rounded-[2px] bg-gold shadow-[0_0_12px_#F4B942]"
        />
      ) : null}
      <Icon
        className="w-5 h-5"
        strokeWidth={active ? 2.4 : 1.8}
        aria-hidden
      />
      <span
        className={cn(
          "text-[10px] leading-none",
          active ? "font-bold" : "font-medium",
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}
