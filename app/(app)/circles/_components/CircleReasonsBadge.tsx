"use client";

import { Info, X } from "lucide-react";
import { useState } from "react";

type Props = {
  reasons: string[];
};

/* Badge "Pourquoi je vois ce cercle ?" cliquable qui affiche la liste
 * exhaustive des raisons de recommandation. Promesse-produit : pas de
 * boîte noire, l'user voit toutes les raisons. */
export function CircleReasonsBadge({ reasons }: Props) {
  const [open, setOpen] = useState(false);

  if (reasons.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-gold/15 text-gold-deep hover:bg-gold/25 text-[10px] font-extrabold transition-colors"
      >
        <Info className="w-3 h-3" aria-hidden />
        Pourquoi ce cercle ?
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pourquoi cette recommandation"
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-night/55 backdrop-blur-sm sm:p-4 overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white border-t sm:border border-line rounded-t-3xl sm:rounded-3xl shadow-[0_40px_100px_-30px_rgba(10,31,68,0.55)] max-h-[92dvh] overflow-y-auto"
          >
            <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-line">
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
                  · Recommandation
                </p>
                <h2 className="mt-1 font-display italic text-[22px] text-night leading-tight">
                  Pourquoi tu vois ce cercle
                </h2>
                <p className="mt-1 text-[12px] text-night-soft">
                  Toutes les raisons sont listées. Aucune n&apos;est cachée.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="w-9 h-9 rounded-full hover:bg-night/5 inline-flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4 text-night-dim" aria-hidden />
              </button>
            </header>

            <ul className="px-5 py-4 space-y-2.5">
              {reasons.map((reason, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-[13px] text-night"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 w-5 h-5 rounded-full bg-gold/15 text-gold-deep inline-flex items-center justify-center text-[10px] font-extrabold shrink-0"
                  >
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{reason}</span>
                </li>
              ))}
            </ul>

            <footer className="px-5 pb-5 pt-2 border-t border-line text-[11px] text-night-dim leading-relaxed">
              <p>
                Tu peux désactiver les recommandations à tout moment dans tes
                réglages, ou choisir un autre tri.
              </p>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
