"use client";

import {
  Check,
  Loader2,
  Music,
  Pause,
  Play,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

/* SoundLibrary — modal de sélection d'un son pour un Reel.
 *
 * Sources :
 *   - Table sounds locale (sons originaux DIVARC + Pixabay déjà cachés)
 *   - Pixabay Music API en fallback (si PIXABAY_API_KEY)
 *
 * UX :
 *   - Recherche autocomplete debounce 350ms
 *   - Tendances par défaut (top usage_count quand q vide)
 *   - Preview audio (Play/Pause inline) — un seul son joue à la fois
 *   - Sélection → onPick(sound)
 */

export type SoundLibraryItem = {
  id: string;
  title: string;
  artist: string;
  duration_seconds: number;
  audio_url: string;
  artwork_url: string | null;
  source: string;
  usage_count: number;
  is_explicit: boolean;
};

type Props = {
  initialSelectedId: string | null;
  onPick: (sound: SoundLibraryItem | null) => void;
  onClose: () => void;
};

export function SoundLibrary({
  initialSelectedId,
  onPick,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SoundLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pixabayAvailable, setPixabayAvailable] = useState<boolean | null>(
    null,
  );
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sounds/search?q=${encodeURIComponent(q)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setResults([]);
        return;
      }
      const json = (await res.json()) as {
        sounds?: SoundLibraryItem[];
        pixabay_available?: boolean;
      };
      setResults(json.sounds ?? []);
      if (json.pixabay_available !== undefined) {
        setPixabayAvailable(json.pixabay_available);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /* Initial load (tendances). */
  useEffect(() => {
    void search("");
  }, [search]);

  /* Debounce recherche. */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void search(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  /* Cleanup audio au unmount. */
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = useCallback((sound: SoundLibraryItem) => {
    /* Si on joue déjà ce son, on pause. */
    if (playingId === sound.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    /* Stop le précédent. */
    if (audioRef.current) {
      audioRef.current.pause();
    }
    /* Lance le nouveau. */
    const audio = new Audio(sound.audio_url);
    audio.volume = 0.7;
    audio.addEventListener("ended", () => setPlayingId(null));
    audio.addEventListener("error", () => {
      setPlayingId(null);
    });
    audioRef.current = audio;
    void audio.play().catch(() => setPlayingId(null));
    setPlayingId(sound.id);
  }, [playingId]);

  const handlePick = (sound: SoundLibraryItem) => {
    /* Stop l'audio preview. */
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
    onPick(sound);
    onClose();
  };

  const handleRemove = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
    onPick(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/70 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Bibliothèque musicale"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-md bg-cream sm:rounded-2xl flex flex-col overflow-hidden h-[80vh] sm:h-[640px]">
        {/* Header. */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-line">
          <p className="font-display italic text-[18px] text-night flex items-center gap-2">
            <Music className="w-4 h-4 text-gold-deep" aria-hidden />
            Choisis un son
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

        {/* Recherche. */}
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
              placeholder="Rechercher un son ou artiste…"
              autoFocus
              className="w-full pl-9 pr-3 py-2 rounded-full border border-line bg-bg-soft text-[13px]"
            />
            {loading ? (
              <Loader2
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-night-muted"
                aria-hidden
              />
            ) : null}
          </div>
        </div>

        {/* Liste. */}
        <div className="flex-1 overflow-y-auto px-1 pt-2 pb-2 min-h-0">
          {!loading && results.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Sparkles
                className="w-7 h-7 text-night-muted mx-auto mb-2"
                aria-hidden
              />
              <p className="text-[13px] text-night-soft mb-1 font-display italic">
                Aucun son trouvé
              </p>
              <p className="text-[12px] text-night-muted leading-snug max-w-xs mx-auto">
                {pixabayAvailable === false
                  ? "Bibliothèque externe non configurée. Crée un son original en publiant un reel."
                  : "Essaie un autre mot-clé (titre, artiste, ambiance)."}
              </p>
            </div>
          ) : null}

          {!loading && query.length === 0 && results.length > 0 ? (
            <p className="px-4 pt-1 pb-2 text-[10.5px] uppercase tracking-wider font-bold text-night-muted">
              · Tendances
            </p>
          ) : null}

          <ul className="divide-y divide-line">
            {results.map((sound) => {
              const isSelected = initialSelectedId === sound.id;
              const isPlaying = playingId === sound.id;
              return (
                <li key={sound.id}>
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    {/* Artwork ou icône Music. */}
                    <button
                      type="button"
                      onClick={() => togglePlay(sound)}
                      className="relative w-12 h-12 rounded-lg bg-night/10 overflow-hidden shrink-0 group"
                      aria-label={isPlaying ? "Pause preview" : "Preview"}
                    >
                      {sound.artwork_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={sound.artwork_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center bg-gradient-to-br from-night to-night-soft">
                          <Music
                            className="w-5 h-5 text-cream/70"
                            aria-hidden
                          />
                        </span>
                      )}
                      <span
                        className={cn(
                          "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity",
                          isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                        )}
                      >
                        {isPlaying ? (
                          <Pause
                            className="w-5 h-5 text-cream fill-cream"
                            aria-hidden
                          />
                        ) : (
                          <Play
                            className="w-5 h-5 text-cream fill-cream ml-0.5"
                            aria-hidden
                          />
                        )}
                      </span>
                    </button>

                    {/* Infos. */}
                    <button
                      type="button"
                      onClick={() => handlePick(sound)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="text-[13px] font-bold text-night truncate flex items-center gap-1.5">
                        {sound.title}
                        {sound.is_explicit ? (
                          <span className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded bg-night/10 text-night-muted">
                            Explicit
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[11.5px] text-night-muted truncate">
                        {sound.artist} ·{" "}
                        {Math.round(sound.duration_seconds)}s
                        {sound.usage_count > 0
                          ? ` · ${formatCompact(sound.usage_count)} reels`
                          : ""}
                      </p>
                    </button>

                    {/* Sélection. */}
                    {isSelected ? (
                      <span
                        className="w-7 h-7 rounded-full bg-gold-deep text-cream flex items-center justify-center"
                        aria-hidden
                      >
                        <Check className="w-4 h-4" aria-hidden />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePick(sound)}
                        className="px-3 py-1 rounded-full bg-night text-cream text-[11px] font-bold hover:bg-night/90 shrink-0"
                      >
                        Choisir
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer : retirer si déjà sélectionné. */}
        {initialSelectedId ? (
          <footer className="border-t border-line bg-bg-soft px-4 py-3 text-center">
            <button
              type="button"
              onClick={handleRemove}
              className="text-[12.5px] text-red-600 font-bold hover:underline"
            >
              Retirer le son du reel
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
