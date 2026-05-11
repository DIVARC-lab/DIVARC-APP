"use client";

import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useEffect, useRef } from "react";

type ConversationSearchBarProps = {
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  matchCount: number;
  activeMatchIndex: number;
  onPrev: () => void;
  onNext: () => void;
};

/* Barre de recherche dans la conversation courante. Slide-down depuis
 * sous le header. Affiche le nombre de matches + Prev/Next. */
export function ConversationSearchBar({
  open,
  query,
  onQueryChange,
  onClose,
  matchCount,
  activeMatchIndex,
  onPrev,
  onNext,
}: ConversationSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "Enter" && matchCount > 0) {
        if (event.shiftKey) onPrev();
        else onNext();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose, onNext, onPrev, matchCount]);

  if (!open) return null;

  return (
    <div className="border-b border-line bg-white px-4 py-2.5 sm:px-6 flex items-center gap-2">
      <Search className="w-4 h-4 text-night-muted shrink-0" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.currentTarget.value)}
        placeholder="Rechercher dans la conversation…"
        className="flex-1 h-9 bg-transparent text-sm text-night placeholder:text-muted/70 outline-none"
      />
      {matchCount > 0 ? (
        <span className="text-[11px] font-semibold text-night-muted shrink-0 tabular-nums">
          {activeMatchIndex + 1}/{matchCount}
        </span>
      ) : query.trim().length > 0 ? (
        <span className="text-[11px] text-night-muted shrink-0">
          Aucun résultat
        </span>
      ) : null}
      <button
        type="button"
        onClick={onPrev}
        disabled={matchCount === 0}
        aria-label="Précédent"
        className="w-8 h-8 rounded-full hover:bg-night/5 text-night-muted hover:text-night disabled:opacity-40 disabled:hover:bg-transparent flex items-center justify-center"
      >
        <ChevronUp className="w-4 h-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={matchCount === 0}
        aria-label="Suivant"
        className="w-8 h-8 rounded-full hover:bg-night/5 text-night-muted hover:text-night disabled:opacity-40 disabled:hover:bg-transparent flex items-center justify-center"
      >
        <ChevronDown className="w-4 h-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer la recherche"
        className="w-8 h-8 rounded-full hover:bg-night/5 text-night-muted hover:text-night flex items-center justify-center"
      >
        <X className="w-4 h-4" aria-hidden />
      </button>
    </div>
  );
}
