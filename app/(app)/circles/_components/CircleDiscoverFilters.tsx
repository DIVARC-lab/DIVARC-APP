"use client";

import {
  Eye,
  Flame,
  MapPin,
  Sparkles,
  TrendingUp,
  Users as UsersIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { listAvailableCircleCategories } from "@/lib/circles/categories";
import { cn } from "@/lib/utils/cn";

type SortValue = "active" | "recent" | "largest" | "nearby" | "recommended";

const SORT_OPTIONS: {
  value: SortValue;
  label: string;
  short: string;
  icon: typeof Flame;
  /* Phrase explicative (transparence : l'user voit comment on trie). */
  explanation: string;
}[] = [
  {
    value: "active",
    label: "Plus actifs cette semaine",
    short: "Actifs",
    icon: Flame,
    explanation:
      "Score d'activité = posts 7j × 0,40 + engagement × 0,30 + nouveaux membres × 0,15 + diversité publieurs × 0,15. Aucun ML.",
  },
  {
    value: "recent",
    label: "Récemment créés",
    short: "Récents",
    icon: Sparkles,
    explanation: "Tri simple par date de création, plus récents d'abord.",
  },
  {
    value: "largest",
    label: "Plus grands",
    short: "Grands",
    icon: UsersIcon,
    explanation: "Tri simple par nombre total de membres, décroissant.",
  },
  {
    value: "nearby",
    label: "Près de chez moi",
    short: "Proches",
    icon: MapPin,
    explanation:
      "Cercles marqués 'local' dans ton pays. La géoloc précise (rayon km) arrive bientôt.",
  },
  {
    value: "recommended",
    label: "Selon mes intérêts",
    short: "Pour moi",
    icon: TrendingUp,
    explanation:
      "Basé sur les sujets de tes cercles actuels et tes interactions. Chaque recommandation explique pourquoi.",
  },
];

type Props = {
  /* Préselection initiale depuis l'URL (server component). */
  initialCategory: string | null;
  initialSort: SortValue;
};

export function CircleDiscoverFilters({
  initialCategory,
  initialSort,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [explainerOpen, setExplainerOpen] = useState<SortValue | null>(null);

  const categories = listAvailableCircleCategories();
  const currentSort: SortValue =
    SORT_OPTIONS.find((o) => o.value === initialSort)?.value ?? "active";

  function pushUrl(nextCategory: string | null, nextSort: SortValue) {
    const sp = new URLSearchParams(params);
    if (nextCategory) sp.set("cat", nextCategory);
    else sp.delete("cat");
    if (nextSort !== "active") sp.set("sort", nextSort);
    else sp.delete("sort");

    const qs = sp.toString();
    startTransition(() => {
      router.replace(qs ? `/circles?${qs}` : "/circles", { scroll: false });
    });
  }

  function selectCategory(catId: string | null) {
    pushUrl(catId, currentSort);
  }
  function selectSort(value: SortValue) {
    pushUrl(initialCategory, value);
  }

  return (
    <div className="space-y-3">
      {/* Filtres catégorie — chips horizontalement scrollables. */}
      <nav
        aria-label="Filtres par catégorie"
        className="flex gap-1.5 overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch] -mx-1 px-1 pb-1"
      >
        <CategoryChip
          label="Tous"
          icon="🌍"
          active={!initialCategory}
          onClick={() => selectCategory(null)}
          disabled={isPending}
        />
        {categories.map((cat) => (
          <CategoryChip
            key={cat.id}
            label={cat.label}
            icon={cat.icon}
            iconType="lucide"
            active={initialCategory === cat.id}
            onClick={() => selectCategory(cat.id)}
            disabled={isPending}
          />
        ))}
      </nav>

      {/* Sort options — toujours visible, transparent. */}
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-night-dim mb-2">
          · Trier par
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((opt) => {
            const active = currentSort === opt.value;
            const Icon = opt.icon;
            const showingExplainer = explainerOpen === opt.value;
            return (
              <div key={opt.value} className="relative">
                <button
                  type="button"
                  onClick={() => selectSort(opt.value)}
                  disabled={isPending}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-9 pl-3 pr-2 rounded-full text-[12px] font-bold transition-colors disabled:opacity-50",
                    active
                      ? "bg-night text-cream"
                      : "bg-white text-night-dim border border-line hover:border-night/30",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden />
                  <span className="hidden sm:inline">{opt.label}</span>
                  <span className="sm:hidden">{opt.short}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExplainerOpen(showingExplainer ? null : opt.value);
                    }}
                    aria-label={`Comment fonctionne le tri ${opt.short}`}
                    className={cn(
                      "inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors",
                      active
                        ? "hover:bg-cream/15 text-cream/70"
                        : "hover:bg-night/5 text-night-dim/60",
                    )}
                  >
                    <Eye className="w-3 h-3" aria-hidden />
                  </button>
                </button>
                {showingExplainer ? (
                  <div className="absolute left-0 right-0 sm:right-auto sm:min-w-[280px] z-20 mt-2 p-3 rounded-xl bg-night text-cream shadow-[0_12px_30px_-12px_rgba(10,31,68,0.4)] text-[11px] leading-relaxed">
                    <p className="font-bold text-cream mb-1 inline-flex items-center gap-1.5">
                      <Eye className="w-3 h-3" aria-hidden />
                      Comment ce tri fonctionne
                    </p>
                    <p className="text-cream/85">{opt.explanation}</p>
                    <button
                      type="button"
                      onClick={() => setExplainerOpen(null)}
                      className="mt-2 text-[10px] font-bold uppercase tracking-wider text-gold hover:text-gold-soft"
                    >
                      Compris
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CategoryChip({
  label,
  icon,
  iconType = "emoji",
  active,
  onClick,
  disabled,
}: {
  label: string;
  icon: string;
  iconType?: "emoji" | "lucide";
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-2xl text-[12px] whitespace-nowrap transition-colors disabled:opacity-50",
        active
          ? "bg-night text-cream font-bold"
          : "bg-white text-night-dim border border-line font-medium hover:border-night/30",
      )}
    >
      {iconType === "emoji" ? (
        <span aria-hidden className="text-[12px] leading-none">
          {icon}
        </span>
      ) : null}
      {label}
    </button>
  );
}
