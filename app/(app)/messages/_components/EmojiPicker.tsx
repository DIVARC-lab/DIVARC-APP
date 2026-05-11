"use client";

/* Emoji picker minimaliste, sans dépendance externe.
 *
 * Catégories prédéfinies (sous-set des plus fréquents — pas la base
 * Unicode complète, on garde V1 léger). Recents persistés en
 * localStorage (top 10).
 *
 * UX :
 *   - Categories en chips tout en haut
 *   - Grid 8-col, scroll vertical fluide
 *   - Click → inject + bump recents
 *   - Escape / click extérieur → close (gérés par parent) */

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "divarc:emoji-recents";
const MAX_RECENTS = 24;

type CategoryId = "recents" | "smileys" | "love" | "hands" | "objects" | "nature";

const CATEGORIES: Array<{
  id: CategoryId;
  label: string;
  emojis: readonly string[];
}> = [
  {
    id: "smileys",
    label: "Smileys",
    emojis: [
      "😀","😃","😄","😁","😆","🥹","😅","😂","🤣","🥲",
      "☺️","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘",
      "😗","😙","😚","😋","😛","😜","🤪","😝","🤑","🤗",
      "🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒",
      "🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒",
      "🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠",
      "🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯",
      "😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭",
      "😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡",
      "😠","🤬","😈","👿","💀","☠️",
    ],
  },
  {
    id: "love",
    label: "Cœurs",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","❣️",
      "💕","💞","💓","💗","💖","💘","💝","💟","💔","♥️",
      "💯","💢","💥","💫","💦","💨","🕳️",
    ],
  },
  {
    id: "hands",
    label: "Mains",
    emojis: [
      "👍","👎","👌","✌️","🤞","🤟","🤘","🤙","👈","👉",
      "👆","👇","☝️","✋","🤚","🖐️","🖖","👋","🤛","🤜",
      "✊","👊","🫶","🤲","🙏","💪","🦾","👏","🙌","🤝",
    ],
  },
  {
    id: "objects",
    label: "Objets",
    emojis: [
      "🔥","✨","🎉","🎊","🎁","🏆","🥇","🥈","🥉","⚡",
      "💎","🔔","🎵","🎶","💡","🔑","🔒","🔓","📌","📍",
      "✅","❌","❗","❓","💬","💭","☑️","✔️","➕","➖",
      "💸","💰","💳","📈","📉","📊","🎯","🚀","⭐","🌟",
    ],
  },
  {
    id: "nature",
    label: "Nature",
    emojis: [
      "🌸","🌺","🌻","🌹","🌷","🌼","🍀","🌿","🌱","🌳",
      "🌴","🌵","🌾","🍂","🍁","🌍","🌎","🌏","🌙","☀️",
      "⛅","☁️","🌧️","⛈️","🌈","❄️","☃️","⛄","🌊","🔥",
    ],
  },
];

const ALL_CATEGORIES: Array<{ id: CategoryId; label: string }> = [
  { id: "recents", label: "Récents" },
  ...CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
];

type EmojiPickerProps = {
  onPick: (emoji: string) => void;
  onClose: () => void;
};

export function EmojiPicker({ onPick, onClose }: EmojiPickerProps) {
  const [active, setActive] = useState<CategoryId>("smileys");
  const [recents, setRecents] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Load recents au mount. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecents(parsed.filter((x): x is string => typeof x === "string"));
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  /* Escape pour fermer. */
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handlePick(emoji: string) {
    onPick(emoji);
    setRecents((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(
        0,
        MAX_RECENTS,
      );
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const currentEmojis = useMemo(() => {
    if (active === "recents") return recents;
    const cat = CATEGORIES.find((c) => c.id === active);
    return cat ? Array.from(cat.emojis) : [];
  }, [active, recents]);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Sélectionner un emoji"
      /* Mobile : bottom-sheet style fixé juste au-dessus du composer
         (56px BottomNav + safe-area + 72px composer height), pleine
         largeur, top rounded. Desktop : popover absolute 320px ancré au
         coin haut-droit du pill input. */
      className={[
        // mobile (fixed bottom-sheet)
        "fixed inset-x-0 z-40",
        "bottom-[calc(56px+env(safe-area-inset-bottom,0px)+72px)]",
        "rounded-t-2xl bg-white border-t border-line shadow-[0_-20px_60px_-20px_rgba(10,31,68,0.3)]",
        // desktop (absolute popover)
        "sm:absolute sm:bottom-full sm:inset-x-auto sm:right-0 sm:w-[320px]",
        "sm:rounded-2xl sm:border sm:mb-2 sm:shadow-[0_20px_60px_-20px_rgba(10,31,68,0.3)]",
        "overflow-hidden",
      ].join(" ")}
    >
      {/* Tabs catégories */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-line overflow-x-auto scrollbar-none">
        {ALL_CATEGORIES.map((cat) => {
          if (cat.id === "recents" && recents.length === 0) return null;
          const isActive = active === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActive(cat.id)}
              aria-pressed={isActive}
              className={`shrink-0 px-2.5 h-7 rounded-full text-[11.5px] font-bold transition-colors ${
                isActive
                  ? "bg-night text-cream"
                  : "text-night-muted hover:bg-night/5 hover:text-night"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="max-h-[280px] overflow-y-auto p-2">
        {currentEmojis.length === 0 ? (
          <p className="text-center py-8 text-xs text-muted">
            {active === "recents"
              ? "Aucun emoji récent — utilises-en un pour le retrouver ici."
              : "Aucun emoji."}
          </p>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {currentEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handlePick(emoji)}
                className="w-9 h-9 rounded-lg text-xl hover:bg-night/5 active:bg-night/10 active:scale-95 transition-transform flex items-center justify-center"
                aria-label={`Insérer ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
