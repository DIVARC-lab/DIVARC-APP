"use client";

import {
  Bell,
  Clock,
  Flame,
  TrendingUp,
  User as UserIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils/cn";

type SortValue = "recent" | "hot_24h" | "hot_7d" | "mine" | "unread";

const SORTS: {
  value: SortValue;
  label: string;
  short: string;
  icon: typeof Flame;
}[] = [
  { value: "recent", label: "Plus récents", short: "Récents", icon: Clock },
  { value: "hot_24h", label: "Engageants 24h", short: "24h", icon: Flame },
  { value: "hot_7d", label: "Engageants 7j", short: "7j", icon: TrendingUp },
  { value: "mine", label: "Mes posts", short: "Mes posts", icon: UserIcon },
  { value: "unread", label: "Non lus", short: "Non lus", icon: Bell },
];

type Props = {
  basePath: string;
  initialSort: SortValue;
};

export function CircleFeedSortFilters({ basePath, initialSort }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function selectSort(value: SortValue) {
    const sp = new URLSearchParams(params);
    if (value === "recent") sp.delete("sort");
    else sp.set("sort", value);

    const qs = sp.toString();
    startTransition(() => {
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    });
  }

  return (
    <nav
      aria-label="Trier les posts"
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
              "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-bold transition-colors disabled:opacity-50",
              active
                ? "bg-night text-cream"
                : "bg-white text-night-dim border border-line hover:border-night/30",
            )}
          >
            <Icon className="w-3 h-3" aria-hidden />
            <span className="hidden sm:inline">{opt.label}</span>
            <span className="sm:hidden">{opt.short}</span>
          </button>
        );
      })}
    </nav>
  );
}
