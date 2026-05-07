"use client";

import { Clock, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { id: "for-you", label: "Pour toi", icon: Sparkles },
  { id: "friends", label: "Amis", icon: Users },
  { id: "latest", label: "Récents", icon: Clock },
] as const;

export type FeedTabId = (typeof TABS)[number]["id"];

type FeedTabsProps = {
  active: FeedTabId;
};

export function FeedTabs({ active }: FeedTabsProps) {
  const params = useSearchParams();

  function buildHref(tab: FeedTabId) {
    const next = new URLSearchParams(params);
    if (tab === "for-you") next.delete("tab");
    else next.set("tab", tab);
    return next.toString() ? `/feed?${next}` : "/feed";
  }

  return (
    <nav
      aria-label="Filtres du feed"
      className="flex items-center gap-1 p-1.5 rounded-2xl bg-night/5 border border-line w-full overflow-x-auto"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={buildHref(tab.id)}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all",
              isActive
                ? "bg-white text-night shadow-soft"
                : "text-night-muted hover:text-night hover:bg-white/40",
            )}
          >
            <Icon className="w-4 h-4" aria-hidden />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
