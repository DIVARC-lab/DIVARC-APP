"use client";

/* WhyThisReel — Chantier Reels Recsys étape 15.
 *
 * Sheet (modale slide-up) déclenchée au tap-long sur un reel.
 * Affiche les `primary_signals` calculés à la volée par
 * /api/reels/[id]/why : pourquoi ce reel apparaît pour cet user,
 * en langage humain.
 *
 * Pattern TikTok "Why am I seeing this?" — c'est le filet de
 * transparence qui équilibre l'opacité du ranker ML.
 */

import { Eye, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Signal = {
  type: string;
  label: string;
  weight: number;
};

type WhyResponse = {
  reel_id: string;
  primary_signals: Signal[];
  source: string;
};

type Props = {
  reelId: string;
  open: boolean;
  onClose: () => void;
};

export function WhyThisReel({ reelId, open, onClose }: Props) {
  const [data, setData] = useState<WhyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    (async () => {
      try {
        const res = await fetch(`/api/reels/${reelId}/why`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const json = (await res.json()) as WhyResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError("Impossible de charger l'explication.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, reelId]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pourquoi ce reel ?"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-night/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl pb-[max(env(safe-area-inset-bottom),16px)] animate-in slide-in-from-bottom-4 duration-200">
        <header className="flex items-center justify-between px-5 pt-5 pb-2">
          <p className="text-[15px] font-extrabold text-night flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-gold-deep" aria-hidden />
            Pourquoi ce reel ?
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex w-8 h-8 items-center justify-center rounded-full text-night-dim hover:bg-bg-soft"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <p className="px-5 text-[12.5px] text-night-soft">
          DIVARC personnalise les Reels avec un algorithme entraîné sur ton
          comportement. Voici les signaux les plus forts qui ont fait remonter
          ce reel pour toi maintenant.
        </p>

        <div className="px-5 mt-4 min-h-[120px]">
          {loading ? (
            <div className="flex items-center gap-2 text-[12px] text-night-dim">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              Calcul des signaux…
            </div>
          ) : error ? (
            <p className="text-[12px] text-rose-700">{error}</p>
          ) : data && data.primary_signals.length > 0 ? (
            <ul className="space-y-2">
              {data.primary_signals.map((s, i) => (
                <li
                  key={s.type + i}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-bg-soft"
                >
                  <span className="inline-flex w-7 h-7 rounded-full bg-gold/20 text-gold-deep items-center justify-center text-[10px] font-extrabold">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-night">
                      {s.label}
                    </p>
                    <p className="text-[10.5px] text-night-dim mt-0.5">
                      Poids relatif : {s.weight.toFixed(2)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-night-dim italic">
              Pas assez de signaux pour ce reel — il a probablement été surfacé
              en exploration.
            </p>
          )}
        </div>

        <div className="px-5 mt-4 mb-2">
          <Link
            href="/about/reels-algorithm"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-night-dim hover:text-gold-deep transition-colors"
          >
            <Eye className="w-3 h-3" aria-hidden />
            Comment fonctionne l&apos;algorithme Reels →
          </Link>
        </div>
      </div>
    </div>
  );
}
