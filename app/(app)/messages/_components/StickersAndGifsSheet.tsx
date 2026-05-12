"use client";

import { Image as ImageIcon, Loader2, Search, Smile, X } from "lucide-react";
import { useEffect, useState } from "react";

type Tab = "stickers" | "gifs";

type StickersAndGifsSheetProps = {
  open: boolean;
  onClose: () => void;
  onPickSticker: (emoji: string) => void;
  onPickGif: (gifUrl: string, previewUrl: string, width: number, height: number) => void;
  initialTab?: Tab;
};

/* Palette de "stickers" = emojis géants curated par thèmes. Sticker
 * = quand l'user envoie un seul emoji ou plusieurs, le message rend
 * en XL côté bubble (cf isStickerBody dans MessageBubble). */
const STICKER_CATEGORIES: Array<{
  id: string;
  name: string;
  emoji: string;
  stickers: string[];
}> = [
  {
    id: "joy",
    name: "Sourires",
    emoji: "😀",
    stickers: ["😀", "😁", "😂", "🤣", "😅", "😆", "😉", "😊", "😋", "😎", "😍", "🥰", "😘", "😗", "🥳", "🤩", "🤗"],
  },
  {
    id: "love",
    name: "Amour",
    emoji: "❤️",
    stickers: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💖", "💗", "💓", "💕", "💞", "💝", "💘", "💌"],
  },
  {
    id: "celeb",
    name: "Fête",
    emoji: "🎉",
    stickers: ["🎉", "🎊", "🥳", "🎂", "🍾", "🥂", "🍻", "🎁", "🎈", "🎀", "🎆", "🎇", "✨", "🪩", "🍰", "🧁", "🎵"],
  },
  {
    id: "thumbs",
    name: "Signes",
    emoji: "👍",
    stickers: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "👋", "🤝", "🙏", "🙌", "👏", "💪", "🦾", "✊", "👊", "🫶"],
  },
  {
    id: "cool",
    name: "Cool",
    emoji: "🔥",
    stickers: ["🔥", "💯", "⚡", "💥", "✨", "🌟", "⭐", "🚀", "💎", "👑", "🏆", "🥇", "🎯", "💫", "🌈", "☀️", "🌞"],
  },
  {
    id: "sad",
    name: "Tristesse",
    emoji: "😢",
    stickers: ["😢", "😭", "😔", "😞", "😟", "😕", "🙁", "☹️", "😣", "😖", "😩", "😫", "🥺", "😿", "💔", "😪", "😴"],
  },
  {
    id: "anger",
    name: "Colère",
    emoji: "😠",
    stickers: ["😠", "😡", "🤬", "😤", "😾", "👿", "💢", "😈", "🔪", "💣", "💀", "☠️", "🤯", "😵", "🙄", "😒", "🤨"],
  },
  {
    id: "food",
    name: "Food",
    emoji: "🍕",
    stickers: ["🍕", "🍔", "🍟", "🌭", "🥙", "🌮", "🍣", "🍜", "🍝", "🍲", "🍦", "🍩", "🍪", "🍫", "🍿", "☕", "🍷"],
  },
  {
    id: "animals",
    name: "Animaux",
    emoji: "🐶",
    stickers: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🦄", "🐝"],
  },
];

/* Tenor GIF search result type. */
type TenorGif = {
  id: string;
  url: string; // page URL
  media_formats: {
    gif?: { url: string; dims: [number, number] };
    tinygif?: { url: string; dims: [number, number] };
    mediumgif?: { url: string; dims: [number, number] };
  };
};

export function StickersAndGifsSheet({
  open,
  onClose,
  onPickSticker,
  onPickGif,
  initialTab = "stickers",
}: StickersAndGifsSheetProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [activeCategory, setActiveCategory] = useState<string>(
    STICKER_CATEGORIES[0]!.id,
  );

  /* Reset le tab à l'ouverture pour respecter initialTab. */
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<TenorGif[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifError, setGifError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  /* Recherche GIF via notre proxy /api/gifs/search (qui appelle Tenor
     côté serveur avec la clé API stockée en env). */
  useEffect(() => {
    if (tab !== "gifs") return;
    const q = gifQuery.trim();
    if (q.length === 0) {
      /* Charge les trending par défaut. */
      void loadGifs("");
      return;
    }
    const id = setTimeout(() => {
      void loadGifs(q);
    }, 300);
    return () => clearTimeout(id);
  }, [tab, gifQuery]);

  async function loadGifs(query: string) {
    setGifLoading(true);
    setGifError(null);
    try {
      const url = query
        ? `/api/gifs/search?q=${encodeURIComponent(query)}`
        : "/api/gifs/trending";
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        setGifError(json.error ?? `HTTP ${res.status}`);
        setGifResults([]);
        return;
      }
      setGifResults(json.results ?? []);
    } catch (err) {
      setGifError(err instanceof Error ? err.message : "Erreur réseau");
      setGifResults([]);
    } finally {
      setGifLoading(false);
    }
  }

  if (!open) return null;

  const category = STICKER_CATEGORIES.find((c) => c.id === activeCategory)!;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Stickers et GIFs"
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-bg border-t border-line rounded-t-3xl shadow-[0_-20px_60px_-20px_rgba(10,31,68,0.4)] pb-[max(env(safe-area-inset-bottom,0px),16px)] max-h-[85dvh] flex flex-col"
      >
        <div
          aria-hidden
          className="mx-auto mt-2.5 mb-1 w-10 h-1 rounded-full bg-night/15"
        />

        <header className="flex items-center gap-2 px-4 pb-2">
          {/* Tab switch */}
          <div className="flex gap-1 p-1 rounded-full bg-night/5 border border-line flex-1">
            <button
              type="button"
              onClick={() => setTab("stickers")}
              aria-pressed={tab === "stickers"}
              className={`flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-full text-xs font-bold transition-colors ${
                tab === "stickers"
                  ? "bg-white text-night shadow-sm"
                  : "text-night-muted hover:text-night"
              }`}
            >
              <Smile className="w-3.5 h-3.5" aria-hidden />
              Stickers
            </button>
            <button
              type="button"
              onClick={() => setTab("gifs")}
              aria-pressed={tab === "gifs"}
              className={`flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-full text-xs font-bold transition-colors ${
                tab === "gifs"
                  ? "bg-white text-night shadow-sm"
                  : "text-night-muted hover:text-night"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" aria-hidden />
              GIFs
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted shrink-0"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        {/* Contenu */}
        {tab === "stickers" ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Catégories */}
            <nav
              aria-label="Catégories de stickers"
              className="flex gap-1 px-2 pb-2 overflow-x-auto scrollbar-none"
            >
              {STICKER_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  aria-pressed={activeCategory === cat.id}
                  title={cat.name}
                  className={`shrink-0 w-10 h-10 rounded-2xl text-xl flex items-center justify-center transition-colors ${
                    activeCategory === cat.id
                      ? "bg-night text-cream"
                      : "hover:bg-night/5"
                  }`}
                >
                  {cat.emoji}
                </button>
              ))}
            </nav>
            {/* Grille de stickers */}
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              <div className="grid grid-cols-6 gap-1">
                {category.stickers.map((sticker, i) => (
                  <button
                    key={`${category.id}-${i}`}
                    type="button"
                    onClick={() => {
                      onPickSticker(sticker);
                    }}
                    className="aspect-square text-4xl flex items-center justify-center rounded-2xl hover:bg-night/5 active:scale-95 transition-transform"
                  >
                    {sticker}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="relative px-3 pb-2">
              <Search
                className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
                aria-hidden
              />
              <input
                type="search"
                value={gifQuery}
                onChange={(e) => setGifQuery(e.currentTarget.value)}
                placeholder="Rechercher des GIFs…"
                aria-label="Rechercher des GIFs"
                className="w-full h-10 rounded-full border border-line bg-white pl-10 pr-3 text-sm text-night placeholder:text-muted/70 focus:outline-none focus:border-night/40"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {gifError ? (
                <div className="text-center py-8 px-4">
                  <p className="text-sm text-red-600 mb-2">⚠️ {gifError}</p>
                  <p className="text-xs text-muted">
                    Configure GIPHY_API_KEY dans Vercel pour activer les
                    GIFs.
                  </p>
                </div>
              ) : gifLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-night-muted" />
                </div>
              ) : gifResults.length === 0 ? (
                <p className="text-center text-xs text-muted py-8">
                  {gifQuery
                    ? "Aucun résultat."
                    : "Recherche un GIF ci-dessus."}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {gifResults.map((gif) => {
                    const fmt =
                      gif.media_formats.tinygif ?? gif.media_formats.mediumgif;
                    if (!fmt) return null;
                    return (
                      <button
                        key={gif.id}
                        type="button"
                        onClick={() => {
                          const fullGif =
                            gif.media_formats.mediumgif ??
                            gif.media_formats.gif ??
                            fmt;
                          onPickGif(
                            fullGif.url,
                            fmt.url,
                            fullGif.dims[0],
                            fullGif.dims[1],
                          );
                        }}
                        className="aspect-square rounded-2xl overflow-hidden bg-night/5 hover:opacity-90 active:scale-95 transition-transform"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={fmt.url}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
