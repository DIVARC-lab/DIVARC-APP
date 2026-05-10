"use client";

import { Check, Info, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId } from "react";

/* WhyThisAdModal — DSA art. 26 conforme.
 *
 * Affiche les critères qui ont conduit à montrer cette publicité à
 * l'utilisateur, sans révéler le détail individuel du targeting de
 * l'annonceur (anti-fingerprinting). Lien vers /settings/privacy/ads
 * pour gérer ses préférences. */

export function WhyThisAdModal({
  open,
  onOpenChange,
  advertiserName,
  reasons,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advertiserName: string;
  reasons: string[];
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-night/40 p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-soft-lg flex flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 border-b border-line">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              aria-hidden
              className="w-9 h-9 rounded-full bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
            >
              <Info className="w-4 h-4" aria-hidden />
            </span>
            <h2 id={titleId} className="font-semibold text-night text-[15px]">
              Pourquoi je vois cette publicité ?
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full hover:bg-night/5 text-night-dim hover:text-night flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <div className="px-5 sm:px-6 py-5 space-y-4">
          <p className="text-[13.5px] text-night-soft leading-relaxed">
            Cette publicité de{" "}
            <strong className="text-night">{advertiserName}</strong> t&apos;est
            montrée pour les raisons suivantes :
          </p>
          <ul className="space-y-1.5">
            {reasons.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[13px] text-night"
              >
                <Check
                  className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                  aria-hidden
                />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <p className="text-[12px] text-night-muted leading-relaxed bg-bg-soft border border-line rounded-2xl p-3">
            <strong className="text-night">Important :</strong> cet annonceur
            ne connaît pas ton identité personnelle. Il a défini un profil
            général (âge, intérêts, localisation) et DIVARC fait correspondre
            son ciblage avec les utilisateurs concernés sans lui transmettre
            d&apos;information individuelle.
          </p>
        </div>

        <footer className="px-5 sm:px-6 py-4 border-t border-line bg-bg-soft/50 flex flex-col gap-2">
          <Link
            href="/settings/privacy/ads"
            className="text-center text-[13px] font-semibold text-night hover:underline"
          >
            Gérer mes préférences publicitaires →
          </Link>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-center text-[12px] text-night-muted hover:text-night"
          >
            Fermer
          </button>
        </footer>
      </div>
    </div>
  );
}
