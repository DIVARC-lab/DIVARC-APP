"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { ChevronDown, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { CATEGORY_LIST, CONDITION_META } from "@/lib/utils/categories";
import type { ListingCategory, ListingCondition } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";

export type SearchFiltersState = {
  q: string;
  categories: ListingCategory[];
  conditions: ListingCondition[];
  priceMin: string;
  priceMax: string;
  sort: "recent" | "trending" | "price_asc" | "price_desc";
};

/* Conditions par "buckets" Vinted-style pour faciliter le choix. On ne propose
 * pas les valeurs legacy (new/like_new/used/fair) — l'user choisit dans les
 * nouvelles, et le filtre legacy reste accessible via les rows existantes. */
const CONDITION_OPTIONS: ListingCondition[] = [
  "new_with_tags",
  "new_without_tags",
  "very_good",
  "good",
  "satisfactory",
  "damaged",
];

const SORT_OPTIONS: {
  value: SearchFiltersState["sort"];
  label: string;
}[] = [
  { value: "recent", label: "Plus récents" },
  { value: "trending", label: "Tendances" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
];

type Props = {
  initial: SearchFiltersState;
  resultsCount: number;
};

export function SearchFilters({ initial, resultsCount }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [state, setState] = useState<SearchFiltersState>(initial);
  const [open, setOpen] = useState(false);

  const minId = useId();
  const maxId = useId();

  function pushUrl(next: SearchFiltersState) {
    const sp = new URLSearchParams();
    if (next.q.trim()) sp.set("q", next.q.trim());
    if (next.categories.length > 0) sp.set("c", next.categories.join(","));
    if (next.conditions.length > 0) sp.set("cd", next.conditions.join(","));
    if (next.priceMin) sp.set("pmin", next.priceMin);
    if (next.priceMax) sp.set("pmax", next.priceMax);
    if (next.sort !== "recent") sp.set("s", next.sort);

    const qs = sp.toString();
    startTransition(() => {
      router.replace(qs ? `/marketplace/search?${qs}` : "/marketplace/search", {
        scroll: false,
      });
    });
  }

  function toggleCategory(id: ListingCategory) {
    const exists = state.categories.includes(id);
    const next = {
      ...state,
      categories: exists
        ? state.categories.filter((c) => c !== id)
        : [...state.categories, id],
    };
    setState(next);
    pushUrl(next);
  }

  function toggleCondition(c: ListingCondition) {
    const exists = state.conditions.includes(c);
    const next = {
      ...state,
      conditions: exists
        ? state.conditions.filter((x) => x !== c)
        : [...state.conditions, c],
    };
    setState(next);
    pushUrl(next);
  }

  function setSort(sort: SearchFiltersState["sort"]) {
    const next = { ...state, sort };
    setState(next);
    pushUrl(next);
  }

  function applyPrice() {
    pushUrl(state);
  }

  function reset() {
    const next: SearchFiltersState = {
      q: "",
      categories: [],
      conditions: [],
      priceMin: "",
      priceMax: "",
      sort: "recent",
    };
    setState(next);
    pushUrl(next);
  }

  const activeFiltersCount =
    state.categories.length +
    state.conditions.length +
    (state.priceMin ? 1 : 0) +
    (state.priceMax ? 1 : 0);

  return (
    <div className="px-5 sm:px-8 pb-3">
      {/* Barre de contrôle : tri + toggle filtres + count */}
      <div className="flex items-center justify-between gap-3 pb-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12px] font-bold transition-colors",
            activeFiltersCount > 0 || open
              ? "bg-night text-cream"
              : "bg-white border border-line text-night hover:border-night/30",
          )}
          aria-expanded={open}
          aria-controls="search-filters-panel"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden />
          Filtres
          {activeFiltersCount > 0 ? (
            <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-night text-[10px] font-extrabold flex items-center justify-center">
              {activeFiltersCount}
            </span>
          ) : null}
        </button>

        <span className="text-[11px] text-night-dim font-medium">
          {isPending
            ? "…"
            : `${resultsCount} résultat${resultsCount > 1 ? "s" : ""}`}
        </span>

        <label className="relative inline-flex items-center">
          <select
            value={state.sort}
            onChange={(e) =>
              setSort(e.target.value as SearchFiltersState["sort"])
            }
            className="appearance-none h-9 pl-3 pr-7 rounded-full bg-white border border-line text-[12px] font-bold text-night focus:outline-none focus:border-night/40 cursor-pointer"
            aria-label="Trier les résultats"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="w-3.5 h-3.5 absolute right-2.5 pointer-events-none text-night-dim"
            aria-hidden
          />
        </label>
      </div>

      {/* Chips de filtres actifs (toujours visibles) */}
      {activeFiltersCount > 0 ? (
        <div className="flex flex-wrap gap-1.5 pb-2.5">
          {state.categories.map((c) => (
            <ActiveChip
              key={`c-${c}`}
              label={CATEGORY_LIST.find((x) => x.id === c)?.label ?? c}
              onRemove={() => toggleCategory(c)}
            />
          ))}
          {state.conditions.map((c) => (
            <ActiveChip
              key={`cd-${c}`}
              label={CONDITION_META[c]}
              onRemove={() => toggleCondition(c)}
            />
          ))}
          {state.priceMin ? (
            <ActiveChip
              label={`Min ${state.priceMin}€`}
              onRemove={() => {
                const next = { ...state, priceMin: "" };
                setState(next);
                pushUrl(next);
              }}
            />
          ) : null}
          {state.priceMax ? (
            <ActiveChip
              label={`Max ${state.priceMax}€`}
              onRemove={() => {
                const next = { ...state, priceMax: "" };
                setState(next);
                pushUrl(next);
              }}
            />
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold text-night-dim hover:text-night transition-colors"
          >
            <RotateCcw className="w-3 h-3" aria-hidden />
            Tout effacer
          </button>
        </div>
      ) : null}

      {/* Panneau dépliable des filtres */}
      {open ? (
        <div
          id="search-filters-panel"
          className="rounded-2xl bg-white border border-line p-4 space-y-4"
        >
          {/* Catégories */}
          <fieldset>
            <legend className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-night-dim mb-2">
              Catégories
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_LIST.map((cat) => {
                const active = state.categories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-8 px-3 rounded-2xl text-[12px] transition-colors",
                      active
                        ? "bg-night text-cream font-bold"
                        : "bg-bg-soft text-night-dim border border-line font-medium hover:border-night/30",
                    )}
                  >
                    <span aria-hidden>{cat.emoji}</span>
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* État */}
          <fieldset>
            <legend className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-night-dim mb-2">
              État
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {CONDITION_OPTIONS.map((c) => {
                const active = state.conditions.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCondition(c)}
                    className={cn(
                      "h-8 px-3 rounded-2xl text-[12px] transition-colors",
                      active
                        ? "bg-night text-cream font-bold"
                        : "bg-bg-soft text-night-dim border border-line font-medium hover:border-night/30",
                    )}
                  >
                    {CONDITION_META[c]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Prix */}
          <fieldset>
            <legend className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-night-dim mb-2">
              Prix (€)
            </legend>
            <div className="flex items-center gap-2">
              <label htmlFor={minId} className="sr-only">
                Prix minimum
              </label>
              <input
                id={minId}
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Min"
                value={state.priceMin}
                onChange={(e) =>
                  setState({ ...state, priceMin: e.target.value })
                }
                onBlur={applyPrice}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyPrice();
                  }
                }}
                className="h-10 w-full rounded-xl border border-line bg-bg-soft px-3 text-[13px] text-night placeholder:text-night-dim focus:outline-none focus:border-night/40"
              />
              <span className="text-night-dim text-xs">—</span>
              <label htmlFor={maxId} className="sr-only">
                Prix maximum
              </label>
              <input
                id={maxId}
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Max"
                value={state.priceMax}
                onChange={(e) =>
                  setState({ ...state, priceMax: e.target.value })
                }
                onBlur={applyPrice}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyPrice();
                  }
                }}
                className="h-10 w-full rounded-xl border border-line bg-bg-soft px-3 text-[13px] text-night placeholder:text-night-dim focus:outline-none focus:border-night/40"
              />
            </div>
          </fieldset>
        </div>
      ) : null}

      {/* Hidden : on conserve la valeur `q` dans l'URL via les params, le
          formulaire de recherche header est géré sur la page serveur. */}
      {params.get("q") && state.q !== params.get("q") ? null : null}
    </div>
  );
}

function ActiveChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full bg-night text-cream text-[11px] font-bold">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Retirer ${label}`}
        className="w-4 h-4 rounded-full hover:bg-cream/15 inline-flex items-center justify-center"
      >
        <X className="w-3 h-3" aria-hidden />
      </button>
    </span>
  );
}
