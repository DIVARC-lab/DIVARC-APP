"use client";

import {
  BookOpen,
  Briefcase,
  Calendar,
  Info,
  MessageSquare,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CircleModules } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";

type Tab = {
  slug: string;
  label: string;
  icon: typeof MessageSquare;
  /* Si défini : l'onglet n'est visible que si modules[key] === true. */
  moduleKey?: keyof CircleModules;
  /* path relatif depuis /circles/[slug] — vide = root (Posts). */
  segment: string;
};

const ALL_TABS: Tab[] = [
  {
    slug: "posts",
    label: "Posts",
    icon: MessageSquare,
    moduleKey: "social_feed",
    segment: "",
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
    slug: "events",
    label: "Événements",
    icon: Calendar,
    moduleKey: "events",
    segment: "/events",
  },
  {
    slug: "members",
    label: "Membres",
    icon: Users,
    segment: "/members",
  },
  {
    slug: "about",
    label: "À propos",
    icon: Info,
    segment: "/about",
  },
];

type Props = {
  circleSlug: string;
  modules: CircleModules | null;
};

export function CircleTabsNav({ circleSlug, modules }: Props) {
  const pathname = usePathname();
  const basePath = `/circles/${circleSlug}`;
  const currentSegment = pathname.replace(basePath, "").replace(/\/$/, "") || "";

  /* Filtre par modules activés. social_feed/members/about toujours visibles. */
  const visible = ALL_TABS.filter((tab) => {
    if (!tab.moduleKey) return true;
    if (tab.moduleKey === "social_feed") return true;
    return modules?.[tab.moduleKey] === true;
  });

  return (
    <nav
      aria-label="Onglets du cercle"
      className="sticky top-0 z-30 bg-bg-soft/95 backdrop-blur-md border-b border-line"
    >
      <div className="overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]">
        <ul className="flex gap-0.5 px-3 sm:px-7 min-w-max">
          {visible.map((tab) => {
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
        </ul>
      </div>
    </nav>
  );
}
