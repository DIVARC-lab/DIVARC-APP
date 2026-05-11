"use client";

import {
  Award,
  Briefcase,
  CalendarHeart,
  Camera,
  GraduationCap,
  Lightbulb,
  MessageSquareQuote,
  Rocket,
  ShoppingBag,
  Sparkles,
  Star,
  User,
  Video,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import type { ProfileFacet } from "@/lib/database.types";

/* ProfileTabsV2 — onglets sticky avec underline gold animé.
 *
 * Affiche les tabs conditionnés aux facettes actives + contenus présents.
 * Sticky au scroll, underline qui slide sur l'onglet actif (signature
 * DIVARC). */

export type ProfileTabId =
  | "about"
  | "posts"
  | "photos"
  | "reels"
  | "highlights"
  | "experiences"
  | "skills"
  | "recommendations"
  | "projects"
  | "publications"
  | "creator"
  | "marketplace"
  | "mentor"
  | "entrepreneur"
  | "jobs";

type TabDef = {
  id: ProfileTabId;
  label: string;
  icon: typeof User;
  /** Si défini, n'affiche que si la facette correspondante est active. */
  requiresFacet?: ProfileFacet;
  /** Si défini, n'affiche que si counter > 0 (passé en props). */
  counterKey?: keyof TabCounters;
};

export type TabCounters = {
  posts?: number;
  photos?: number;
  reels?: number;
  highlights?: number;
  experiences?: number;
  recommendations?: number;
  projects?: number;
  publications?: number;
  jobs?: number;
  marketplace?: number;
};

const ALL_TABS: TabDef[] = [
  { id: "about", label: "À propos", icon: User },
  { id: "posts", label: "Posts", icon: Sparkles, counterKey: "posts" },
  { id: "photos", label: "Photos", icon: Camera, counterKey: "photos" },
  { id: "reels", label: "Reels", icon: Video, counterKey: "reels" },
  {
    id: "highlights",
    label: "Highlights",
    icon: Star,
    counterKey: "highlights",
  },
  {
    id: "experiences",
    label: "Expérience",
    icon: Briefcase,
    requiresFacet: "professionnel",
  },
  {
    id: "skills",
    label: "Compétences",
    icon: GraduationCap,
    requiresFacet: "professionnel",
  },
  {
    id: "recommendations",
    label: "Recommandations",
    icon: MessageSquareQuote,
    requiresFacet: "professionnel",
    counterKey: "recommendations",
  },
  {
    id: "projects",
    label: "Projets",
    icon: Lightbulb,
    requiresFacet: "professionnel",
    counterKey: "projects",
  },
  {
    id: "publications",
    label: "Publications",
    icon: Award,
    requiresFacet: "professionnel",
    counterKey: "publications",
  },
  {
    id: "creator",
    label: "Créateur",
    icon: Sparkles,
    requiresFacet: "createur",
  },
  {
    id: "marketplace",
    label: "Annonces",
    icon: ShoppingBag,
    requiresFacet: "vendeur",
    counterKey: "marketplace",
  },
  {
    id: "mentor",
    label: "Mentor",
    icon: CalendarHeart,
    requiresFacet: "mentor",
  },
  {
    id: "entrepreneur",
    label: "Entrepreneur",
    icon: Rocket,
    requiresFacet: "entrepreneur",
  },
  { id: "jobs", label: "Jobs", icon: Briefcase, counterKey: "jobs" },
];

type Props = {
  facets: ProfileFacet[];
  counters: TabCounters;
  /** Pas de filter — show tab même si counter=0 (pour own profile en édition). */
  showAll?: boolean;
};

export function ProfileTabsV2({ facets, counters, showAll = false }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") ?? "about") as ProfileTabId;

  /* Filter selon facettes + contenu */
  const visibleTabs = ALL_TABS.filter((tab) => {
    if (tab.requiresFacet && !facets.includes(tab.requiresFacet)) return false;
    if (!showAll && tab.counterKey) {
      const count = counters[tab.counterKey] ?? 0;
      if (count === 0 && tab.id !== "posts" && tab.id !== "about") return false;
    }
    return true;
  });

  return (
    <nav
      aria-label="Sections du profil"
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-line shadow-[0_1px_0_rgba(10,31,68,0.04)]"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-2 px-2">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;
            const counter = tab.counterKey ? counters[tab.counterKey] : undefined;
            return (
              <Link
                key={tab.id}
                href={`${pathname}?tab=${tab.id}`}
                scroll={false}
                className={cn(
                  "relative shrink-0 inline-flex items-center gap-1.5 px-3 py-3.5 text-[13px] font-semibold transition-colors",
                  isActive
                    ? "text-night"
                    : "text-night-muted hover:text-night",
                )}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden />
                {tab.label}
                {counter !== undefined && counter > 0 ? (
                  <span className="ml-1 text-[11px] text-night-dim tabular-nums">
                    {counter}
                  </span>
                ) : null}
                {isActive ? (
                  <motion.span
                    layoutId="profile-tabs-underline"
                    aria-hidden
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                    className="absolute left-2 right-2 bottom-0 h-[2px] rounded-full bg-gold-deep"
                  />
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
