"use client";

import { Keyboard, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

/* Keyboard shortcuts desktop pour le feed.
 *
 * Shortcuts actifs :
 *   J     → post suivant (scrollIntoView le prochain post visible)
 *   K     → post précédent
 *   /     → focus la search bar globale (TopBar)
 *   ?     → ouvre la modale d'aide listant les shortcuts
 *   ESC   → ferme la modale d'aide
 *
 * Important : on ignore TOUS les keydown si le focus actif est dans un
 * input, textarea ou contenteditable (l'user est en train de taper).
 *
 * Pour trouver le "post actif" lors de J/K, on cherche tous les
 * éléments avec data-post-id (ajoutés par PostCard) et on prend celui
 * dont le top est le plus proche du milieu du viewport.
 */
export function KeyboardShortcuts() {
  const [helpOpen, setHelpOpen] = useState(false);

  const findActivePostIndex = useCallback((): {
    posts: HTMLElement[];
    activeIndex: number;
  } => {
    const posts = Array.from(
      document.querySelectorAll<HTMLElement>("[data-post-id]"),
    );
    if (posts.length === 0) return { posts, activeIndex: -1 };

    /* Centre du viewport — on prend le post le plus proche. */
    const center = window.innerHeight / 2;
    let activeIndex = 0;
    let minDist = Infinity;
    posts.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const elCenter = rect.top + rect.height / 2;
      const dist = Math.abs(elCenter - center);
      if (dist < minDist) {
        minDist = dist;
        activeIndex = i;
      }
    });
    return { posts, activeIndex };
  }, []);

  const scrollToPost = useCallback((el: HTMLElement) => {
    /* Scroll avec offset pour laisser la TopBar (56px) au-dessus. */
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      /* Ignore si focus dans input / textarea / contenteditable. */
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          active.isContentEditable
        ) {
          /* Sauf ESC qui doit toujours marcher (pour défocus + fermer modales). */
          if (e.key !== "Escape") return;
        }
      }

      /* ESC ferme la modale d'aide. */
      if (e.key === "Escape" && helpOpen) {
        e.preventDefault();
        setHelpOpen(false);
        return;
      }

      /* ? ouvre la modale (Shift+/ sur clavier FR/US). */
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      /* / focus la search bar globale (input[type=search] dans TopBar). */
      if (e.key === "/") {
        const search = document.querySelector<HTMLInputElement>(
          'input[type="search"]',
        );
        if (search) {
          e.preventDefault();
          search.focus();
          search.select();
        }
        return;
      }

      /* J / K navigation entre posts. */
      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        const { posts, activeIndex } = findActivePostIndex();
        const next = posts[Math.min(activeIndex + 1, posts.length - 1)];
        if (next) scrollToPost(next);
        return;
      }
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        const { posts, activeIndex } = findActivePostIndex();
        const prev = posts[Math.max(activeIndex - 1, 0)];
        if (prev) scrollToPost(prev);
        return;
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [helpOpen, findActivePostIndex, scrollToPost]);

  if (!helpOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aide raccourcis clavier"
      onClick={() => setHelpOpen(false)}
      className="fixed inset-0 z-50 bg-night/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-bg rounded-3xl border border-line shadow-[0_20px_60px_-20px_rgba(10,31,68,0.4)] overflow-hidden"
      >
        <header className="px-5 pt-5 pb-3 border-b border-line flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-night-muted" aria-hidden />
          <h2 className="text-sm font-bold text-night flex-1">
            Raccourcis clavier
          </h2>
          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>
        <ul className="p-3">
          <ShortcutRow keys={["J"]} label="Post suivant" />
          <ShortcutRow keys={["K"]} label="Post précédent" />
          <ShortcutRow keys={["/"]} label="Rechercher" />
          <ShortcutRow keys={["?"]} label="Afficher cette aide" />
          <ShortcutRow keys={["Esc"]} label="Fermer une modale" />
        </ul>
        <footer className="px-5 py-3 border-t border-line bg-bg-soft text-[11px] italic text-night-muted">
          Astuce : les raccourcis sont ignorés quand tu écris dans un
          champ texte.
        </footer>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <li className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-night/[0.03]">
      <span className="text-sm text-night">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={i}
            className={cn(
              "inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md",
              "bg-white border border-line text-[11px] font-mono font-semibold text-night",
              "shadow-[0_1px_0_0_var(--color-line)]",
            )}
          >
            {k}
          </kbd>
        ))}
      </div>
    </li>
  );
}
