"use client";

import {
  BarChart3,
  Bot,
  BookOpen,
  Briefcase,
  Calendar,
  ChevronDown,
  GraduationCap,
  HandshakeIcon,
  Hash,
  Info,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Search,
  Sparkles,
  Store,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CircleModules, CircleRole } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";

type Tab = {
  slug: string;
  label: string;
  icon: typeof MessageSquare;
  /* Si défini : l'onglet n'est visible que si modules[key] === true. */
  moduleKey?: keyof CircleModules;
  /* path relatif depuis /circles/[slug] — vide = root (Posts). */
  segment: string;
  /* Si true : visible uniquement pour les owner + admin. */
  adminOnly?: boolean;
  /* Sprint UX — primary = visible direct dans la nav. Sinon dans le
     menu "Plus". Pour Posts/Chat/Live/Membres. */
  primary?: boolean;
};

const ALL_TABS: Tab[] = [
  {
    slug: "posts",
    label: "Posts",
    icon: MessageSquare,
    moduleKey: "social_feed",
    segment: "",
    primary: true,
  },
  {
    slug: "chat",
    label: "Chat",
    icon: MessageSquare,
    moduleKey: "chat",
    segment: "/chat",
    primary: true,
  },
  {
    slug: "live",
    label: "Live",
    icon: Mic,
    moduleKey: "live_rooms",
    segment: "/live",
    primary: true,
  },
  {
    slug: "members",
    label: "Membres",
    icon: Users,
    segment: "/members",
    primary: true,
  },
  /* Reste dans le menu "Plus" */
  {
    slug: "events",
    label: "Événements",
    icon: Calendar,
    moduleKey: "events",
    segment: "/events",
  },
  {
    slug: "market",
    label: "Marketplace",
    icon: Store,
    moduleKey: "marketplace",
    segment: "/market",
  },
  {
    slug: "jobs",
    label: "Jobs",
    icon: Briefcase,
    moduleKey: "jobs",
    segment: "/jobs",
  },
  {
    slug: "library",
    label: "Library",
    icon: BookOpen,
    moduleKey: "library",
    segment: "/library",
  },
  {
    slug: "mentorship",
    label: "Mentorat",
    icon: GraduationCap,
    moduleKey: "mentorship",
    segment: "/mentorship",
  },
  {
    slug: "requests",
    label: "Demandes & Offres",
    icon: HandshakeIcon,
    moduleKey: "requests",
    segment: "/requests",
  },
  {
    slug: "ai",
    label: "Assistant IA",
    icon: Sparkles,
    moduleKey: "ai_assistant",
    segment: "/ai",
  },
  {
    slug: "leaderboard",
    label: "Classement",
    icon: Trophy,
    segment: "/leaderboard",
  },
  {
    slug: "search",
    label: "Recherche",
    icon: Search,
    segment: "/search",
  },
  {
    slug: "about",
    label: "À propos",
    icon: Info,
    segment: "/about",
  },
  /* Admin only */
  {
    slug: "analytics",
    label: "Analytics",
    icon: BarChart3,
    segment: "/analytics",
    adminOnly: true,
  },
  {
    slug: "bots",
    label: "Bots",
    icon: Bot,
    moduleKey: "bots",
    segment: "/bots",
    adminOnly: true,
  },
  {
    slug: "channels",
    label: "Channels",
    icon: Hash,
    segment: "/channels",
    adminOnly: true,
  },
];

type Props = {
  circleSlug: string;
  modules: CircleModules | null;
  currentRole?: CircleRole | null;
};

export function CircleTabsNav({ circleSlug, modules, currentRole }: Props) {
  const pathname = usePathname();
  const basePath = `/circles/${circleSlug}`;
  const currentSegment = pathname.replace(basePath, "").replace(/\/$/, "") || "";

  const isAdmin = currentRole === "owner" || currentRole === "admin";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLLIElement>(null);

  /* Close menu au clic ailleurs. */
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }
  }, [menuOpen]);

  /* Filtre par modules + rôle. */
  const visible = ALL_TABS.filter((tab) => {
    if (tab.adminOnly && !isAdmin) return false;
    if (!tab.moduleKey) return true;
    if (tab.moduleKey === "social_feed") return true;
    return modules?.[tab.moduleKey] === true;
  });

  const primary = visible.filter((t) => t.primary);
  const secondary = visible.filter((t) => !t.primary);

  /* Si l'onglet actif est dans "Plus", on l'affiche aussi dans le label
     du bouton "Plus" pour clarifier (ex: "Plus · Analytics"). */
  const activeSecondary = secondary.find((t) => t.segment === currentSegment);

  return (
    <nav
      aria-label="Onglets du cercle"
      className="sticky top-0 z-30 bg-bg-soft/95 backdrop-blur-md border-b border-line"
    >
      <div className="overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]">
        <ul className="flex gap-0.5 px-3 sm:px-7 min-w-max items-center">
          {primary.map((tab) => {
            const href = `${basePath}${tab.segment}`;
            const active = currentSegment === tab.segment;
            const Icon = tab.icon;
            return (
              <li key={tab.slug}>
                <Link
                  href={href}
                  scroll={false}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 h-11 px-3 sm:px-4 text-[12px] sm:text-[13px] font-bold whitespace-nowrap transition-colors",
                    active
                      ? "text-night"
                      : "text-night-dim hover:text-night",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    className={cn(
                      "w-3.5 h-3.5",
                      active ? "text-gold-deep" : "text-night-dim/70",
                    )}
                    aria-hidden
                  />
                  {tab.label}
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-2 sm:inset-x-3 bottom-0 h-[2.5px] rounded-t-full bg-gradient-to-r from-gold to-gold-deep"
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}

          {/* Bouton "Plus" avec dropdown des onglets secondaires. */}
          {secondary.length > 0 ? (
            <li className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="true"
                className={cn(
                  "relative inline-flex items-center gap-1.5 h-11 px-3 sm:px-4 text-[12px] sm:text-[13px] font-bold whitespace-nowrap transition-colors",
                  activeSecondary
                    ? "text-night"
                    : "text-night-dim hover:text-night",
                )}
              >
                <MoreHorizontal
                  className={cn(
                    "w-3.5 h-3.5",
                    activeSecondary
                      ? "text-gold-deep"
                      : "text-night-dim/70",
                  )}
                  aria-hidden
                />
                {activeSecondary ? `Plus · ${activeSecondary.label}` : "Plus"}
                <ChevronDown
                  className={cn(
                    "w-3 h-3 transition-transform",
                    menuOpen ? "rotate-180" : "",
                  )}
                  aria-hidden
                />
                {activeSecondary ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-2 sm:inset-x-3 bottom-0 h-[2.5px] rounded-t-full bg-gradient-to-r from-gold to-gold-deep"
                  />
                ) : null}
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-3 top-full mt-1 w-64 rounded-2xl bg-white border border-line shadow-2xl overflow-hidden z-40"
                >
                  <ul className="py-1 max-h-[70vh] overflow-y-auto">
                    {secondary.map((tab) => {
                      const href = `${basePath}${tab.segment}`;
                      const active = currentSegment === tab.segment;
                      const Icon = tab.icon;
                      return (
                        <li key={tab.slug}>
                          <Link
                            href={href}
                            scroll={false}
                            onClick={() => setMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2.5 text-[13px] transition-colors",
                              active
                                ? "bg-gold/10 text-night font-bold"
                                : "text-night hover:bg-bg-soft",
                            )}
                            aria-current={active ? "page" : undefined}
                          >
                            <Icon
                              className={cn(
                                "w-4 h-4 shrink-0",
                                active
                                  ? "text-gold-deep"
                                  : "text-night-dim",
                              )}
                              aria-hidden
                            />
                            <span className="flex-1">{tab.label}</span>
                            {tab.adminOnly ? (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gold-deep bg-gold/15 px-1.5 py-0.5 rounded-full">
                                Admin
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </li>
          ) : null}
        </ul>
      </div>
    </nav>
  );
}
