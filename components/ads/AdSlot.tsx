"use client";

import { useEffect, useState } from "react";
import { SponsoredCard } from "./SponsoredCard";

/* AdSlot — composant client qui demande une ad à l'auction engine au
 * mount et affiche le SponsoredCard si une ad est servie. Sinon, rien
 * (le caller affiche son contenu organique).
 *
 * Densité publicitaire : c'est le caller qui décide combien d'AdSlot
 * insérer (1 / 5-7 posts feed, 1 / 12 listings marketplace, etc.).
 *
 * Pour V2 : pré-fetch côté server au render initial pour éviter le FOUC
 * et améliorer LCP. Ici on accepte un léger flicker pour V1.
 */

type AdSlotProps = {
  surface: "feed_home" | "marketplace_feed" | "jobs_feed" | "stories";
  slotIndex: number;
};

type ServedAd = {
  ad_id: string;
  advertiser_name: string;
  primary_text: string;
  headline: string;
  description: string | null;
  media_url: string | null;
  destination_url: string | null;
  call_to_action: string;
  auto_disclaimer: string | null;
  manual_disclaimer: string | null;
  paid_for_by: string | null;
  why_reasons: string[];
  surface: string;
  charged_amount: number;
};

export function AdSlot({ surface, slotIndex }: AdSlotProps) {
  const [ad, setAd] = useState<ServedAd | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ads/serve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        surface,
        slot_index: slotIndex,
        device_type:
          typeof window !== "undefined" && window.innerWidth < 768
            ? "mobile"
            : "desktop",
        locale: typeof navigator !== "undefined" ? navigator.language : null,
      }),
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 204) {
          setLoaded(true);
          return;
        }
        if (!res.ok) {
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
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [surface, slotIndex]);

  if (!loaded) return null;
  if (!ad) return null;

  return (
    <SponsoredCard
      adId={ad.ad_id}
      advertiserName={ad.advertiser_name}
      primaryText={ad.primary_text}
      headline={ad.headline}
      description={ad.description}
      mediaUrl={ad.media_url}
      destinationUrl={ad.destination_url}
      callToAction={ad.call_to_action}
      autoDisclaimer={ad.auto_disclaimer}
      manualDisclaimer={ad.manual_disclaimer}
      paidForBy={ad.paid_for_by}
      whyReasons={ad.why_reasons}
      surface={ad.surface}
    />
  );
}
