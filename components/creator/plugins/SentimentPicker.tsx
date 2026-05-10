"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  ACTIVITIES,
  SENTIMENTS,
  type ActivitySelection,
  type SentimentOption,
  type SentimentSelection,
} from "@/lib/posts/sentiments";

/* SentimentPicker — drawer modal pour choisir un sentiment ("heureux 😊")
 * ou une activité ("regarde Inception 🎬"). Style Facebook "Comment te
 * sens-tu ?".
 *
 * Modal externe : le parent gère l'overlay/backdrop. Le composant rend
 * juste son propre header + tabs + grid + footer Apply.
 *
 * Sortie via onSelect(sentiment | activity | null) — null = remove. */

type Props = {
  initialSentiment: SentimentSelection | null;
  initialActivity: ActivitySelection | null;
  onApply: (
    sentiment: SentimentSelection | null,
    activity: ActivitySelection | null,
  ) => void;
  onClose: () => void;
};

type Tab = "sentiment" | "activity";

export function SentimentPicker({
  initialSentiment,
  initialActivity,
  onApply,
  onClose,
}: Props) {
  /* Si l'user avait déjà une activité, on ouvre direct sur le tab activité. */
  const [tab, setTab] = useState<Tab>(
    initialActivity ? "activity" : "sentiment",
  );
  const [query, setQuery] = useState("");
  const [sentiment, setSentiment] = useState<SentimentSelection | null>(
    initialSentiment,
  );
  const [activity, setActivity] = useState<ActivitySelection | null>(
    initialActivity,
  );

  const filteredSentiments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SENTIMENTS;
    return SENTIMENTS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.emoji.includes(q) ||
        s.keywords?.some((k) => k.toLowerCase().includes(q)),
    );
  }, [query]);

  const apply = () => {
    /* Sentiment et activité s'excluent : si l'user a sélectionné les
       deux on garde celui du tab actuel. */
    if (tab === "sentiment") {
      onApply(sentiment, null);
    } else {
      onApply(null, activity);
    }
    onClose();
  };

  const clear = () => {
    onApply(null, null);
    onClose();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden">
      {/* Header. */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <p className="font-display italic text-[18px] text-night">
          Comment te sens-tu ?
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-night-muted hover:text-night"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" aria-hidden />
        </button>
      </header>

      {/* Tabs. */}
      <div className="flex items-center gap-1 px-4 pt-3">
        <TabBtn active={tab === "sentiment"} onClick={() => setTab("sentiment")}>
          😊 Sentiment
        </TabBtn>
        <TabBtn active={tab === "activity"} onClick={() => setTab("activity")}>
          🎬 Activité
        </TabBtn>
      </div>

      {/* Recherche (sentiments uniquement). */}
      {tab === "sentiment" ? (
        <div className="px-4 pt-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-muted"
              aria-hidden
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Recherche un sentiment…"
              className="w-full pl-9 pr-3 py-2 rounded-full border border-line bg-bg-soft text-[13px]"
            />
          </div>
        </div>
      ) : null}

      {/* Body scrollable. */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 min-h-0">
        {tab === "sentiment" ? (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {filteredSentiments.map((s) => (
              <li key={`${s.emoji}-${s.label}`}>
                <SentimentTile
                  option={s}
                  active={
                    sentiment?.label === s.label && sentiment?.emoji === s.emoji
                  }
                  onClick={() =>
                    setSentiment({ emoji: s.emoji, label: s.label })
                  }
                />
              </li>
            ))}
            {filteredSentiments.length === 0 ? (
              <li className="col-span-full text-center text-[12.5px] text-night-muted py-6">
                Aucun résultat. Essaye un autre mot-clé.
              </li>
            ) : null}
          </ul>
        ) : (
          <div className="space-y-2">
            {ACTIVITIES.map((a) => {
              const isSelected = activity?.type === a.type;
              return (
                <div
                  key={a.type}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    isSelected
                      ? "border-night bg-night/[0.03]"
                      : "border-line bg-white hover:border-night/30",
                  )}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setActivity(
                        isSelected
                          ? null
                          : { type: a.type, detail: activity?.detail ?? "" },
                      )
                    }
                    className="w-full flex items-center gap-2.5 text-left"
                  >
                    <span aria-hidden className="text-2xl">
                      {a.emoji}
                    </span>
                    <span className="text-[13.5px] font-bold text-night">
                      {a.verb}
                    </span>
                  </button>
                  {isSelected ? (
                    <input
                      type="text"
                      value={activity.detail}
                      onChange={(e) =>
                        setActivity({ type: a.type, detail: e.target.value })
                      }
                      placeholder={a.detailPlaceholder}
                      maxLength={120}
                      autoFocus
                      className="mt-2 w-full px-3 py-2 rounded-lg border border-line bg-white text-[13px]"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer actions. */}
      <footer className="flex items-center justify-between gap-2 px-4 py-3 border-t border-line bg-bg-soft">
        <button
          type="button"
          onClick={clear}
          className="text-[12.5px] text-night-muted hover:text-red-600 font-semibold"
        >
          Retirer
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={
            (tab === "sentiment" && !sentiment) ||
            (tab === "activity" &&
              (!activity ||
                (ACTIVITIES.find((a) => a.type === activity.type)
                  ?.detailRequired &&
                  activity.detail.trim().length === 0)))
          }
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-night text-cream text-[13px] font-bold disabled:opacity-40"
        >
          Valider
        </button>
      </footer>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-[12.5px] font-bold transition-colors",
        active
          ? "bg-night text-cream"
          : "text-night-muted hover:bg-bg-soft border border-transparent hover:border-line",
      )}
    >
      {children}
    </button>
  );
}

function SentimentTile({
  option,
  active,
  onClick,
}: {
  option: SentimentOption;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors text-left",
        active
          ? "border-night bg-night/[0.04]"
          : "border-line bg-white hover:border-night/30",
      )}
    >
      <span aria-hidden className="text-xl">
        {option.emoji}
      </span>
      <span className="text-[12.5px] font-semibold text-night truncate">
        {option.label}
      </span>
    </button>
  );
}
