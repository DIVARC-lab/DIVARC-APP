"use client";

import { Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

/* StoryAdSlot — variant fullscreen pour le viewer Stories.
 *
 * Format : plein écran 9:16, image en background avec overlay textuel
 * (style Instagram Stories Ads). Contrairement au SponsoredCard
 * qui est en flux, celui-ci occupe l'écran entier et l'utilisateur
 * tape pour passer à la story suivante.
 *
 * Conformité DSA art. 26 :
 *   - Badge "Sponsorisé" en haut + nom annonceur
 *   - Bouton info → modal "Why this ad?"
 *   - Tap sur ad = action CTA, swipe = next
 */

type StoryAdSlotProps = {
  surface: "stories";
  slotIndex: number;
  /** Callback déclenché quand l'ad est passée (auto après 6s ou tap right). */
  onComplete?: () => void;
  /** Callback close du viewer entier (croix top-right). */
  onClose?: () => void;
};

type ServedAd = {
  ad_id: string;
  advertiser_name: string;
  primary_text: string;
  headline: string;
  media_url: string | null;
  destination_url: string | null;
  call_to_action: string;
  auto_disclaimer: string | null;
  paid_for_by: string | null;
  why_reasons: string[];
};

const STORY_DURATION_MS = 6000;

export function StoryAdSlot({
  surface,
  slotIndex,
  onComplete,
  onClose,
}: StoryAdSlotProps) {
  const [ad, setAd] = useState<ServedAd | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  /* Fetch ad via auction. */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ads/serve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surface, slot_index: slotIndex }),
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 204) {
          /* Pas d'ad → skip immédiatement. */
          onComplete?.();
          setLoaded(true);
          return;
        }
        if (!res.ok) {
          onComplete?.();
          setLoaded(true);
          return;
        }
        const data = (await res.json()) as ServedAd;
        if (!cancelled) {
          setAd(data);
          setLoaded(true);
        }
      })
      .catch(() => {
        onComplete?.();
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [surface, slotIndex, onComplete]);

  /* Progress bar 6s + auto-complete. */
  useEffect(() => {
    if (!ad) return;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / STORY_DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [ad, onComplete]);

  if (!loaded) return null;
  if (!ad) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Background image */}
      {ad.media_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ad.media_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : null}
      {/* Overlay gradient pour lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

      {/* Progress bar */}
      <div className="absolute top-2.5 left-3 right-3 h-0.5 bg-white/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-white transition-all duration-75 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header — badge sponsorisé + close */}
      <header className="absolute top-6 left-3 right-3 flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold bg-gold/90 text-night px-2 py-0.5 rounded">
            Sponsorisé
          </span>
          <span className="text-[12px] font-semibold truncate">
            {ad.advertiser_name}
          </span>
          {ad.paid_for_by ? (
            <span className="text-[10px] text-white/80 italic">
              · {ad.paid_for_by}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Pourquoi cette publicité ?"
            className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center"
          >
            <Info className="w-4 h-4" aria-hidden />
          </button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </header>

      {/* Content area — texte + CTA en bas */}
      <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
        <h3 className="text-[20px] font-display font-normal leading-[1.1] mb-2">
          {ad.headline}
        </h3>
        <p className="text-[14px] leading-relaxed text-white/90 mb-4">
          {ad.primary_text}
        </p>
        {ad.destination_url ? (
          <Link
            href={`/api/ads/click?ad=${ad.ad_id}&dest=${encodeURIComponent(ad.destination_url)}`}
            target="_blank"
            rel="noreferrer noopener"
            className="block w-full text-center px-4 py-3 rounded-full bg-white text-night text-[14px] font-semibold hover:bg-white/90"
          >
            {ctaLabel(ad.call_to_action)}
          </Link>
        ) : null}
        {ad.auto_disclaimer ? (
          <p className="mt-3 text-[10px] text-white/70 italic leading-tight">
            {ad.auto_disclaimer}
          </p>
        ) : null}
      </div>

      {/* Tap to skip (right half) / replay (left half) */}
      <button
        type="button"
        onClick={() => onComplete?.()}
        aria-label="Passer cette publicité"
        className="absolute top-0 right-0 w-1/2 h-full opacity-0"
      />
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
