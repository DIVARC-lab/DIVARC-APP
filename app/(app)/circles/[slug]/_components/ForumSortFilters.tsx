"use client";

/* Sprint B.4 — Sort filters spécifiques aux channels forum (Reddit-style).
 * Remplace CircleFeedSortFilters quand le channel actif est de type
 * 'forum'. Hot/New/Top — préserve le param `channel`. */

import { Clock, Flame, TrendingUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils/cn";

type SortValue = "hot" | "recent" | "top";

const SORTS: {
  value: SortValue;
  label: string;
  icon: typeof Flame;
}[] = [
  { value: "hot", label: "Hot", icon: Flame },
  { value: "recent", label: "Récents", icon: Clock },
  { value: "top", label: "Top", icon: TrendingUp },
];

type Props = {
  basePath: string;
  initialSort: SortValue;
};

export function ForumSortFilters({ basePath, initialSort }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function selectSort(value: SortValue) {
    const sp = new URLSearchParams(params?.toString() ?? "");
    if (value === "hot") sp.delete("sort");
    else sp.set("sort", value);

    const qs = sp.toString();
    startTransition(() => {
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    });
  }

  return (
    <nav
      aria-label="Trier les threads forum"
      className="flex gap-1.5 overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch] -mx-1 px-1 pb-1"
    >
      {SORTS.map((opt) => {
        const active = initialSort === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => selectSort(opt.value)}
            disabled={isPending}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[12px] font-bold transition-colors disabled:opacity-50",
              active
                ? "bg-night text-cream"
                : "bg-white text-night-dim border border-line hover:border-night/30",
            )}
            aria-pressed={active}
          >
            <Icon className="w-3 h-3" aria-hidden />
            {opt.label}
          </button>
        );
      })}
    </nav>
  );
}
