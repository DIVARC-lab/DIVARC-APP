"use client";

import { Info, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { WhyThisAdModal } from "./WhyThisAdModal";

/* SponsoredCard — affichage d'une ad servie par l'auction engine.
 *
 * Conformité DSA art. 26 :
 *   - Badge "Sponsorisé" + nom annonceur en évidence
 *   - Bouton "Pourquoi je vois cette pub ?" → modal explicative
 *   - Bouton "Masquer" / "Signaler" / "Désactiver perso" en menu
 *
 * Disclaimer auto (Évin, ANJ, ACPR, Royer) affiché si présent dans
 * la creative (auto_disclaimer ou manual_disclaimer).
 */

type SponsoredCardProps = {
  adId: string;
  advertiserName: string;
  primaryText: string;
  headline: string;
  description: string | null;
  mediaUrl: string | null;
  destinationUrl: string | null;
  callToAction: string;
  autoDisclaimer: string | null;
  manualDisclaimer: string | null;
  paidForBy: string | null;
  whyReasons: string[];
  surface: string;
};

export function SponsoredCard(props: SponsoredCardProps) {
  const [whyOpen, setWhyOpen] = useState(false);

  return (
    <article className="rounded-[28px] bg-white shadow-soft overflow-hidden">
      {/* Header sponsorisé */}
      <header className="flex items-center justify-between px-4 pt-3.5 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.18em] text-gold-deep font-extrabold">
            · Sponsorisé
          </span>
          <span className="text-[12px] text-night-muted truncate">
            {props.advertiserName}
          </span>
          {props.paidForBy ? (
            <span className="text-[10px] text-night-muted italic">
              · payé par {props.paidForBy}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setWhyOpen(true)}
            aria-label="Pourquoi je vois cette publicité ?"
            className="w-8 h-8 rounded-full hover:bg-night/5 text-night-muted hover:text-night flex items-center justify-center"
          >
            <Info className="w-3.5 h-3.5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Options de l'ad"
            className="w-8 h-8 rounded-full hover:bg-night/5 text-night-muted hover:text-night flex items-center justify-center"
          >
            <MoreHorizontal className="w-3.5 h-3.5" aria-hidden />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="px-4 pb-4">
        <p className="text-[14px] text-night leading-relaxed">
          {props.primaryText}
        </p>

        {props.mediaUrl ? (
          <div className="mt-3 rounded-[18px] overflow-hidden bg-bg-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={props.mediaUrl}
              alt={props.headline}
              className="w-full h-auto block"
            />
          </div>
        ) : null}

        {/* Card CTA */}
        <div className="mt-3 rounded-[16px] border border-line bg-bg-soft p-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-night truncate">
              {props.headline}
            </p>
            {props.description ? (
              <p className="text-[12px] text-night-muted truncate">
                {props.description}
              </p>
            ) : null}
          </div>
          {props.destinationUrl ? (
            <Link
              href={`/api/ads/click?ad=${props.adId}&dest=${encodeURIComponent(props.destinationUrl)}`}
              target="_blank"
              rel="noreferrer noopener"
              className="shrink-0 inline-flex items-center px-3.5 py-1.5 rounded-full bg-night text-cream text-[12px] font-semibold hover:bg-night/90"
            >
              {ctaLabel(props.callToAction)}
            </Link>
          ) : null}
        </div>

        {/* Disclaimers (Évin, ANJ, ACPR, Royer) */}
        {(props.autoDisclaimer || props.manualDisclaimer) ? (
          <p className="mt-2 text-[10.5px] text-night-muted italic leading-tight">
            {props.autoDisclaimer ?? props.manualDisclaimer}
          </p>
        ) : null}
      </div>

      <WhyThisAdModal
        open={whyOpen}
        onOpenChange={setWhyOpen}
        advertiserName={props.advertiserName}
        reasons={props.whyReasons}
      />
    </article>
  );
}

function ctaLabel(cta: string): string {
  return (
    {
      learn_more: "En savoir plus",
      shop_now: "Acheter",
      sign_up: "S'inscrire",
      subscribe: "S'abonner",
      download: "Télécharger",
      contact_us: "Nous contacter",
      book_now: "Réserver",
      apply_now: "Postuler",
      get_quote: "Obtenir un devis",
      get_offer: "Voir l'offre",
      send_message: "Envoyer un message",
    }[cta] ?? "Voir"
  );
}
