"use client";

import { Bookmark, Briefcase, Heart, Info, MessageCircle, Send, Smartphone } from "lucide-react";

/* AdPreview — preview multi-placement live pour le wizard.
 *
 * Affiche le rendu approximatif de l'ad sur chaque placement sélectionné :
 *   - feed_home : SponsoredCard mobile (375px) + desktop (572px)
 *   - marketplace_feed : ListingCard avec badge "Sponsorisé"
 *   - jobs_feed : JobCard avec badge "Sponsorisé"
 *   - stories : fullscreen 9:16 mockup
 *
 * Pas de fetch réel — c'est un mockup statique basé sur les valeurs
 * du formulaire wizard (passées en props).
 */

type AdPreviewProps = {
  primaryText: string;
  headline: string;
  description: string;
  mediaUrl: string;
  callToAction: string;
  advertiserName: string;
  autoDisclaimer?: string | null;
  selectedPlacements: string[];
};

export function AdPreview({
  primaryText,
  headline,
  description,
  mediaUrl,
  callToAction,
  advertiserName,
  autoDisclaimer,
  selectedPlacements,
}: AdPreviewProps) {
  if (selectedPlacements.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-bg-soft p-6 text-center text-[12.5px] text-night-muted">
        Sélectionne au moins un placement pour voir le preview.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
        <Smartphone className="inline w-3 h-3 mr-1" aria-hidden />
        Preview ({selectedPlacements.length} placement
        {selectedPlacements.length > 1 ? "s" : ""})
      </p>

      <div className="space-y-5">
        {selectedPlacements.includes("feed_home") ? (
          <FeedPreview
            primaryText={primaryText}
            headline={headline}
            description={description}
            mediaUrl={mediaUrl}
            callToAction={callToAction}
            advertiserName={advertiserName}
            autoDisclaimer={autoDisclaimer}
          />
        ) : null}

        {selectedPlacements.includes("marketplace_feed") ||
        selectedPlacements.includes("marketplace_listing_boost") ? (
          <MarketplacePreview
            headline={headline}
            mediaUrl={mediaUrl}
            advertiserName={advertiserName}
            description={description}
          />
        ) : null}

        {selectedPlacements.includes("jobs_feed") ? (
          <JobsPreview
            headline={headline}
            primaryText={primaryText}
            advertiserName={advertiserName}
          />
        ) : null}

        {selectedPlacements.includes("stories") ? (
          <StoriesPreview
            primaryText={primaryText}
            headline={headline}
            mediaUrl={mediaUrl}
            callToAction={callToAction}
            advertiserName={advertiserName}
          />
        ) : null}
      </div>

      <p className="text-[11px] text-night-muted italic px-1">
        Ces previews sont des approximations. Le rendu final dépend du
        device, de la taille de l&apos;écran et du contenu autour de l&apos;ad.
      </p>
    </div>
  );
}

/* === Feed home === */
function FeedPreview(props: {
  primaryText: string;
  headline: string;
  description: string;
  mediaUrl: string;
  callToAction: string;
  advertiserName: string;
  autoDisclaimer?: string | null;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-night-muted font-bold mb-2">
        Feed Home (mobile)
      </p>
      <div className="mx-auto max-w-[375px] rounded-[28px] bg-white shadow-soft overflow-hidden">
        <header className="flex items-center justify-between px-4 pt-3.5 pb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] uppercase tracking-[0.18em] text-gold-deep font-extrabold">
              · Sponsorisé
            </span>
            <span className="text-[12px] text-night-muted truncate">
              {props.advertiserName || "Annonceur"}
            </span>
          </div>
          <Info className="w-3.5 h-3.5 text-night-muted" aria-hidden />
        </header>
        <div className="px-4 pb-4">
          <p className="text-[14px] text-night leading-relaxed">
            {props.primaryText || "Texte principal de ton ad…"}
          </p>
          {props.mediaUrl ? (
            <div className="mt-3 rounded-[18px] overflow-hidden bg-bg-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={props.mediaUrl}
                alt=""
                className="w-full h-auto block"
              />
            </div>
          ) : (
            <div className="mt-3 rounded-[18px] bg-bg-soft border border-line h-40 flex items-center justify-center text-[11px] text-night-muted">
              [Image / vidéo]
            </div>
          )}
          <div className="mt-3 rounded-[16px] border border-line bg-bg-soft p-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-night truncate">
                {props.headline || "Titre"}
              </p>
              {props.description ? (
                <p className="text-[12px] text-night-muted truncate">
                  {props.description}
                </p>
              ) : null}
            </div>
            <span className="shrink-0 inline-flex items-center px-3.5 py-1.5 rounded-full bg-night text-cream text-[12px] font-semibold">
              {ctaLabel(props.callToAction)}
            </span>
          </div>
          {props.autoDisclaimer ? (
            <p className="mt-2 text-[10.5px] text-night-muted italic leading-tight">
              {props.autoDisclaimer}
            </p>
          ) : null}
          <div className="mt-3 flex items-center gap-3 text-night-muted text-[12px]">
            <Heart className="w-4 h-4" aria-hidden />
            <MessageCircle className="w-4 h-4" aria-hidden />
            <Send className="w-4 h-4" aria-hidden />
            <span className="ml-auto">
              <Bookmark className="w-4 h-4" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* === Marketplace === */
function MarketplacePreview(props: {
  headline: string;
  mediaUrl: string;
  advertiserName: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-night-muted font-bold mb-2">
        Marketplace
      </p>
      <div className="mx-auto w-44 rounded-2xl bg-white border border-line overflow-hidden">
        <div className="aspect-square bg-bg-soft relative">
          {props.mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.mediaUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : null}
          <span className="absolute top-1.5 left-1.5 text-[9px] uppercase tracking-wider font-extrabold bg-gold-deep text-cream px-1.5 py-0.5 rounded">
            Sponsorisé
          </span>
        </div>
        <div className="p-2.5">
          <p className="text-[12px] font-semibold text-night truncate">
            {props.headline || "Titre annonce"}
          </p>
          <p className="text-[10px] text-night-muted truncate">
            {props.advertiserName || "Annonceur"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* === Jobs === */
function JobsPreview(props: {
  headline: string;
  primaryText: string;
  advertiserName: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-night-muted font-bold mb-2">
        Jobs
      </p>
      <div className="mx-auto max-w-md rounded-2xl bg-white border border-line p-4 flex items-start gap-3">
        <span
          aria-hidden
          className="w-10 h-10 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
        >
          <Briefcase className="w-[18px] h-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider font-extrabold bg-gold-deep text-cream px-1.5 py-0.5 rounded">
              Sponsorisé
            </span>
            <p className="text-[14px] font-semibold text-night truncate">
              {props.headline || "Titre poste"}
            </p>
          </div>
          <p className="text-[12px] text-night-muted">
            {props.advertiserName || "Entreprise"}
          </p>
          <p className="text-[12.5px] text-night-soft mt-1 line-clamp-2">
            {props.primaryText || "Description…"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* === Stories === */
function StoriesPreview(props: {
  primaryText: string;
  headline: string;
  mediaUrl: string;
  callToAction: string;
  advertiserName: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-night-muted font-bold mb-2">
        Stories (plein écran 9:16)
      </p>
      <div className="mx-auto w-44 aspect-[9/16] rounded-3xl overflow-hidden bg-night relative">
        {props.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.mediaUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        <div className="absolute top-2 left-2 right-2 flex items-center gap-1.5 text-white">
          <span className="text-[8px] uppercase tracking-wider font-extrabold bg-gold/90 text-night px-1.5 py-0.5 rounded">
            Sponsorisé
          </span>
          <span className="text-[9px] truncate">
            {props.advertiserName || "Annonceur"}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          <p className="text-[11px] font-semibold leading-tight mb-1">
            {props.headline || "Titre"}
          </p>
          <p className="text-[9px] text-white/80 leading-tight mb-2 line-clamp-3">
            {props.primaryText || "Texte principal…"}
          </p>
          <span className="block w-full text-center px-2 py-1.5 rounded-full bg-white text-night text-[9px] font-semibold">
            {ctaLabel(props.callToAction)}
          </span>
        </div>
      </div>
    </div>
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
    }[cta] ?? "Voir"
  );
}
