"use client";

import {
  Compass,
  Home,
  MessageSquareText,
  Plus,
  Sparkle,
  User,
} from "lucide-react";
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
    href: "/dashboard",
    label: "Accueil",
    icon: Home,
    match: (p) => p === "/dashboard" || p === "/",
  },
  {
    href: "/explore",
    label: "Découvrir",
    icon: Compass,
    match: (p) => p.startsWith("/explore"),
  },
  {
    href: "/feed",
    label: "Feed",
    icon: Sparkle,
    match: (p) => p.startsWith("/feed"),
  },
  {
    href: "/messages",
    label: "Messages",
    icon: MessageSquareText,
    match: (p) => p.startsWith("/messages"),
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

  /* Hide bottom nav on flow-immersive pages (story viewer, full-screen
     forms, login) where it would clutter. */
  const HIDDEN_PREFIXES = [
    "/stories/",
    "/login",
    "/signup",
    "/welcome",
    "/invite/",
  ];
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      aria-label="Navigation principale"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/92 backdrop-blur-xl border-t border-line pb-[env(safe-area-inset-bottom,0px)]"
    >
      <ul className="flex items-end justify-around px-2 pt-2 pb-2">
        {ITEMS.map((item, idx) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          const isCenter = idx === 2;
          /* Center "Feed" item is rendered as a regular nav item, but a
             dedicated FAB for /create sits absolute in the middle — see
             below. */
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 transition-colors",
                  active ? "text-night" : "text-night-muted",
                  isCenter && "pt-0",
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    active && "text-gold-deep",
                  )}
                  strokeWidth={active ? 2.4 : 1.8}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-[10px] font-semibold tracking-tight",
                    active ? "text-night" : "text-night-muted",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Floating "+" FAB on top of center slot — opens the global "Créer" flow. */}
      <Link
        href="/create"
        aria-label="Créer"
        className="absolute left-1/2 -top-5 -translate-x-1/2 w-12 h-12 rounded-full bg-gold text-night flex items-center justify-center shadow-[0_8px_22px_rgba(244,185,66,0.45)] hover:bg-gold-soft transition-colors"
      >
        <Plus className="w-5 h-5" strokeWidth={2.6} aria-hidden />
      </Link>
    </nav>
  );
}
