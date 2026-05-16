"use client";

/* Sprint Recsys — Étape 21 : Banner cold start.
 *
 * Affiché en haut du feed pendant les phases NEW/LEARNING/ADJUSTING (< 7j).
 * Stabilized → caché.
 *
 * - Label + description tirés de get_user_cold_start_info() RPC
 * - Progress bar dans la phase courante
 * - CTA "Personnaliser mes intérêts" → /settings/feed
 * - Dismiss avec localStorage par phase (ne re-spam pas)
 */

import { Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ColdStartInfo } from "@/lib/queries/coldStart";

type Props = {
  info: ColdStartInfo;
};

export function ColdStartBanner({ info }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const storageKey = `divarc.coldstart.dismissed.${info.phase}`;

  /* On lit le state dismissed depuis localStorage. Mounted-effect pour
     éviter hydration mismatch (window indispo en SSR). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "1") setDismissed(true);
    } catch {
      /* localStorage disabled / safe-private mode → on garde affiché. */
    }
  }, [storageKey]);

  /* On masque pour stabilized + dismissed. */
  if (info.phase === "stabilized") return null;
  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      role="status"
      className="relative rounded-3xl bg-gradient-to-br from-cream via-white to-cream-deep border border-gold/30 shadow-soft p-4 sm:p-5 mb-4"
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Masquer le bandeau d'accueil"
        className="absolute top-3 right-3 inline-flex items-center justify-center w-7 h-7 rounded-full text-night-dim hover:bg-night/5 hover:text-night transition-colors"
      >
        <X className="w-3.5 h-3.5" aria-hidden />
      </button>

      <div className="flex items-start gap-3 pr-7">
        <div className="shrink-0 w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-gold-deep" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
            · {info.phase_label}
          </p>
          <p className="mt-1 text-[13px] text-night leading-relaxed">
            {info.phase_desc}
          </p>

          {/* Barre de progression dans la phase courante. */}
          <div className="mt-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-night-dim">
                Personnalisation
              </span>
              <span className="text-[10px] font-bold tabular-nums text-gold-deep">
                {info.phase_progress_pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-bg-soft overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold to-gold-deep transition-all duration-700"
                style={{ width: `${info.phase_progress_pct}%` }}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/settings/feed"
              className="inline-flex items-center h-8 px-3 rounded-full bg-night text-bg text-[11px] font-bold hover:opacity-90 transition-opacity"
            >
              Personnaliser mes intérêts
            </Link>
            <Link
              href="/about/feed-algorithm"
              className="inline-flex items-center h-8 px-3 rounded-full bg-white border border-line text-[11px] font-bold text-night-dim hover:text-night hover:border-night/30 transition-colors"
            >
              Comment ça marche ?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
