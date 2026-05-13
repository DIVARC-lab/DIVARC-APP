"use client";

/* AntiDoomscrollPause — Chantier Feed 6.1.
 *
 * Carte "pause cosy" insérée toutes les 20 posts dans le feed. L'objectif :
 *   - rappeler à l'utilisateur qu'il a vu beaucoup de contenu
 *   - lui proposer une pause sans le culpabiliser
 *   - rester respectueuse, jamais bloquante (un clic continue)
 *
 * Anti-doomscroll est le coeur de la promesse DIVARC : on n'optimise PAS le
 * temps passé. Cf. /about/feed-algorithm § "garde-fous anti-toxicité".
 *
 * Position dans le feed : composant injecté par la page feed après chaque
 * tranche de 20 posts. Le compteur "sessions cumulées" est stocké en
 * sessionStorage pour ne pas réapparaître à chaque hot-reload.
 */
import { Coffee, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

type Props = {
  /** Numéro de la pause (1, 2, 3...) — sert au message et à la persistence. */
  pauseIndex: number;
};

const QUOTES: Array<{ text: string; author: string }> = [
  {
    text: "Le temps que tu donnes à ta santé mentale, c'est du temps gagné.",
    author: "Manifeste DIVARC",
  },
  {
    text: "Tu as autre chose à faire que scroller. Tu le sais.",
    author: "—",
  },
  {
    text: "L'attention n'est pas une matière première à extraire.",
    author: "Charte DIVARC",
  },
  {
    text: "Préfère 12 minutes vraies à 90 minutes hypnotiques.",
    author: "Page transparence",
  },
];

export function AntiDoomscrollPause({ pauseIndex }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const storageKey = `divarc:antidoom:dismissed:${pauseIndex}`;

  useEffect(() => {
    /* Si l'user a déjà fermé cette pause-ci cette session, on reste plié. */
    if (typeof window !== "undefined") {
      const v = window.sessionStorage.getItem(storageKey);
      if (v === "1") setDismissed(true);
    }
  }, [storageKey]);

  if (dismissed) {
    return (
      <div
        role="region"
        aria-label="Pause minimisée"
        className="rounded-2xl bg-bg-soft border border-line p-3 text-center"
      >
        <p className="text-[11px] text-night-dim">
          · Tu as déjà vu {pauseIndex * 20} posts cette session ·
        </p>
      </div>
    );
  }

  const quote = QUOTES[(pauseIndex - 1) % QUOTES.length]!;

  function dismiss() {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      /* sessionStorage indisponible : pas grave. */
    }
  }

  return (
    <aside
      role="region"
      aria-label="Pause anti-doomscroll"
      className={cn(
        "relative rounded-3xl p-5 sm:p-6 text-center overflow-hidden",
        "bg-gradient-to-br from-cream via-bg-soft to-gold/15 border border-gold/30",
      )}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer cette pause"
        className="absolute top-3 right-3 inline-flex w-7 h-7 items-center justify-center rounded-full text-night-dim hover:text-night hover:bg-white/60 transition-colors"
      >
        <X className="w-3.5 h-3.5" aria-hidden />
      </button>

      <Coffee
        className="w-7 h-7 mx-auto text-gold-deep"
        aria-hidden
      />
      <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
        · Pause · {pauseIndex * 20} posts vus
      </p>
      <p className="mt-2 font-display italic text-[20px] sm:text-[24px] leading-[1.15] text-night text-balance px-2">
        « {quote.text} »
      </p>
      <p className="mt-1 text-[11px] text-night-dim">— {quote.author}</p>

      <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-night text-cream text-[12px] font-extrabold hover:bg-night-soft transition-colors"
        >
          <Sparkles className="w-3 h-3" aria-hidden />
          Continuer un peu
        </button>
        <Link
          href="/about/feed-algorithm"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-night-dim hover:text-night text-[12px] font-bold transition-colors"
        >
          Pourquoi cette pause ?
        </Link>
      </div>
    </aside>
  );
}
