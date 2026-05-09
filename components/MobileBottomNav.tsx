"use client";

/**
 * MobileBottomNav — direction "Bold" du handoff design team.
 *
 * Implémenté pixel d'après design_handoff_divarc_refonte/feed-shared.jsx
 * (TabBar) + le brief Session 4 :
 *
 * - Fixed bottom, hidden md+, h ~78px (paddingBottom env safe-area)
 * - 5 slots : Accueil / Marché / + (FAB) / Emploi / Profil
 * - Slot du milieu = bouton circulaire 50px rempli en gold qui DÉPASSE
 *   vers le haut (margin-top négatif), shadow gold/45, dirige vers /create
 * - Autres slots : icon lucide 22 + label 10px sous, état actif en navy +
 *   label font-bold (sinon text-night-dim)
 * - Border-top var(--line), bg white, backdrop-blur-xl
 * - Caché sur les pages flow-immersives (story viewer, login, welcome…)
 *
 * 100% Tailwind v4. Aucun style={{}} inline.
 */
import { Briefcase, Home, Plus, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type Item = {
  href: string;
  label: string;
  icon: typeof Home;
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

export function MobileBottomNav() {
  const pathname = usePathname() ?? "";

  /* Hide bottom nav sur les pages flow-immersives. */
  const HIDDEN_PREFIXES = [
    "/stories/",
    "/login",
    "/signup",
    "/welcome",
    "/invite/",
    "/create",
  ];
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      aria-label="Navigation principale"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-line pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="grid grid-cols-5 items-end px-2 pt-2 pb-2 max-w-md mx-auto">
        {/* Slot 1 : Accueil */}
        <BottomNavItem item={ITEMS[0]!} pathname={pathname} />
        {/* Slot 2 : Marché */}
        <BottomNavItem item={ITEMS[1]!} pathname={pathname} />

        {/* Slot 3 (centre) : FAB Créer — dépasse vers le haut */}
        <div className="flex justify-center -mt-5">
          <Link
            href="/create"
            aria-label="Créer"
            className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-gold text-night shadow-[0_8px_22px_rgba(244,185,66,0.45)] hover:bg-gold-soft hover:scale-105 transition-transform"
          >
            <Plus className="w-6 h-6" strokeWidth={2.6} aria-hidden />
          </Link>
        </div>

        {/* Slot 4 : Emploi */}
        <BottomNavItem item={ITEMS[2]!} pathname={pathname} />
        {/* Slot 5 : Profil */}
        <BottomNavItem item={ITEMS[3]!} pathname={pathname} />
      </div>
    </nav>
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
        "flex flex-col items-center gap-0.5 px-2 py-1.5 transition-colors",
        active ? "text-night" : "text-fg-subtle",
      )}
    >
      <Icon
        className={cn("w-[22px] h-[22px]", active ? "text-night" : "")}
        strokeWidth={active ? 2.4 : 1.8}
        aria-hidden
      />
      <span
        className={cn(
          "text-[10px] tracking-tight",
          active ? "text-night font-bold" : "text-fg-subtle font-semibold",
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}
