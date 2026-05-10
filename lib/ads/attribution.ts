import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

/* Attribution multi-modèle pour ad_conversions.
 *
 * Modèles supportés :
 *   - last_click   : 100% au dernier clic (défaut V1)
 *   - first_click  : 100% au premier clic
 *   - linear       : réparti également entre tous les clics
 *   - time_decay   : poids exponentiel demi-vie 7j (récents > anciens)
 *   - position_based : 40% premier + 40% dernier + 20% milieu
 *
 * Configuration par campaign : campaign.metadata.attribution_model
 * (V2 — pour l'instant on stocke directement dans l'attribution_model
 * de chaque conversion).
 *
 * Pipeline (cron) :
 *   1. Récup conversions où attributed_ad_id IS NULL ET created_at > 7j
 *   2. Pour chaque conversion + user_id :
 *      - Récup tous les clicks valides (is_invalid=false) du user
 *        dans fenêtre [event_time-window_days, event_time]
 *      - Si 0 click → impressions (view-through 1j) → si 0 → skip
 *      - Si 1+ clicks → applique modèle d'attribution
 *   3. Pour les modèles linear / time_decay / position_based :
 *      on insère plusieurs lignes virtuelles dans ad_conversions
 *      via une jointure de débit fractionnel (V2).
 *      Pour V1 : on attribue au "winner" du modèle (premier ou dernier
 *      ou pondéré max).
 *
 * Fenêtres :
 *   - Click   : 1, 7, 28 jours (défaut 7)
 *   - View-through : 1 jour (défaut)
 */

export type AttributionModel =
  | "last_click"
  | "first_click"
  | "linear"
  | "time_decay"
  | "position_based";

export type AttributionConfig = {
  model: AttributionModel;
  click_window_days: number;
  view_through_window_days: number;
};

const DEFAULT_CONFIG: AttributionConfig = {
  model: "last_click",
  click_window_days: 7,
  view_through_window_days: 1,
};

export type Touchpoint = {
  click_id: string;
  ad_id: string;
  campaign_id: string;
  ad_account_id: string;
  created_at: string;
};

export type AttributionResult = {
  /* Pour V1 : on retourne le touchpoint "winner" + sa fraction de crédit. */
  attributed_click_id: string;
  attributed_ad_id: string;
  attribution_model: AttributionModel;
  attribution_window_days: number;
  /* Pour les modèles fractionnels, [0..1]. last/first → 1.0. */
  credit_fraction: number;
};

/* Calcule l'attribution selon le modèle, retourne le touchpoint
 * principal qui sera enregistré sur la conversion. Pour les modèles
 * multi-touch (linear, time_decay, position_based), on conserve le
 * touchpoint avec la plus grosse fraction de crédit, et on documente
 * la fraction dans `credit_fraction`. */
export function attribute(
  touchpoints: Touchpoint[],
  conversionTime: Date,
  config: AttributionConfig = DEFAULT_CONFIG,
): AttributionResult | null {
  if (touchpoints.length === 0) return null;
  /* Tri chronologique. */
  const sorted = [...touchpoints].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  switch (config.model) {
    case "first_click": {
      const winner = sorted[0]!;
      return {
        attributed_click_id: winner.click_id,
        attributed_ad_id: winner.ad_id,
        attribution_model: "first_click",
        attribution_window_days: config.click_window_days,
        credit_fraction: 1,
      };
    }
    case "last_click": {
      const winner = sorted[sorted.length - 1]!;
      return {
        attributed_click_id: winner.click_id,
        attributed_ad_id: winner.ad_id,
        attribution_model: "last_click",
        attribution_window_days: config.click_window_days,
      credit_fraction: 1,
      };
    }
    case "linear": {
      /* Crédit identique à chaque touchpoint. On choisit arbitrairement
         le dernier comme "winner" pour le record principal. */
      const winner = sorted[sorted.length - 1]!;
      return {
        attributed_click_id: winner.click_id,
        attributed_ad_id: winner.ad_id,
        attribution_model: "linear",
        attribution_window_days: config.click_window_days,
        credit_fraction: 1 / sorted.length,
      };
    }
    case "time_decay": {
      /* Poids exponentiel demi-vie 7 jours.
         weight(i) = 2^(-(conversionTime - touch_i.time) / 7d)
         Le winner = touchpoint avec le plus gros poids (= le plus récent). */
      const halfLifeMs = 7 * 24 * 3600 * 1000;
      let bestWeight = 0;
      let winner = sorted[0]!;
      let totalWeight = 0;
      for (const t of sorted) {
        const dt = conversionTime.getTime() - new Date(t.created_at).getTime();
        const w = Math.pow(0.5, dt / halfLifeMs);
        totalWeight += w;
        if (w > bestWeight) {
          bestWeight = w;
          winner = t;
        }
      }
      return {
        attributed_click_id: winner.click_id,
        attributed_ad_id: winner.ad_id,
        attribution_model: "time_decay",
        attribution_window_days: config.click_window_days,
        credit_fraction: bestWeight / totalWeight,
      };
    }
    case "position_based": {
      /* 40% premier + 40% dernier + 20% réparti milieu.
         Si 1 touch : 100% premier=dernier.
         Si 2 touch : 50/50 (premier 40+10=50, dernier 40+10=50).
         Sinon : winner = premier ou dernier (40%) selon récence. */
      if (sorted.length === 1) {
        const winner = sorted[0]!;
        return {
          attributed_click_id: winner.click_id,
          attributed_ad_id: winner.ad_id,
          attribution_model: "position_based",
          attribution_window_days: config.click_window_days,
          credit_fraction: 1,
        };
      }
      const last = sorted[sorted.length - 1]!;
      return {
        attributed_click_id: last.click_id,
        attributed_ad_id: last.ad_id,
        attribution_model: "position_based",
        attribution_window_days: config.click_window_days,
        credit_fraction: sorted.length === 2 ? 0.5 : 0.4,
      };
    }
  }
}

/* Helper async pour récupérer les touchpoints d'un user dans une fenêtre. */
export async function fetchTouchpoints(
  userId: string,
  conversionTime: Date,
  windowDays: number,
): Promise<Touchpoint[]> {
  const admin = createAdminClient();
  const windowStart = new Date(
    conversionTime.getTime() - windowDays * 24 * 3600 * 1000,
  );
  const { data: clicks } = await admin
    .from("ad_clicks")
    .select("id, ad_id, campaign_id, ad_account_id, created_at")
    .eq("user_id", userId)
    .eq("is_invalid", false)
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", conversionTime.toISOString())
    .order("created_at", { ascending: true });
  if (!clicks) return [];
  return clicks.map((c) => ({
    click_id: c.id,
    ad_id: c.ad_id,
    campaign_id: c.campaign_id,
    ad_account_id: c.ad_account_id,
    created_at: c.created_at,
  }));
}
