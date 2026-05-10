import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

/* Calcul du funnel de conversion pour un ad_account.
 *
 * Étapes standard suivies (ordre logique d'achat e-commerce) :
 *   1. PageView         (visite du site)
 *   2. ViewContent      (consultation fiche produit / catégorie)
 *   3. AddToCart        (ajout panier)
 *   4. InitiateCheckout (entrée tunnel commande)
 *   5. Purchase         (achat finalisé)
 *
 * Sources : ad_conversions (Pixel + Conversions API), filtré par
 * fenêtre temporelle.
 *
 * Pour les funnels lead generation, on retourne aussi un funnel
 * alternatif (PageView → ViewContent → Lead) en parallèle.
 */

export type FunnelStep = {
  event_name: string;
  label: string;
  count: number;
  /* Conversion rate vs étape précédente (0-1). null pour la 1ère. */
  step_conversion_rate: number | null;
  /* Drop-off vs étape précédente (0-1). null pour la 1ère. */
  drop_off_rate: number | null;
  /* Conversion rate vs étape 1 (top of funnel). */
  total_conversion_rate: number | null;
};

export type FunnelData = {
  pixel_id: string;
  pixel_name: string;
  steps: FunnelStep[];
  total_value: number;
  /* Pour l'affichage Sankey : edges entre steps. */
  flows: Array<{
    from: string;
    to: string;
    count: number;
  }>;
};

const STANDARD_FUNNEL = [
  { event_name: "PageView", label: "Vue de page" },
  { event_name: "ViewContent", label: "Vue produit" },
  { event_name: "AddToCart", label: "Ajout panier" },
  { event_name: "InitiateCheckout", label: "Tunnel commande" },
  { event_name: "Purchase", label: "Achat" },
];

const LEAD_FUNNEL = [
  { event_name: "PageView", label: "Vue de page" },
  { event_name: "ViewContent", label: "Vue contenu" },
  { event_name: "Lead", label: "Lead capturé" },
  { event_name: "CompleteRegistration", label: "Inscription complète" },
];

export async function buildFunnel(args: {
  ad_account_id: string;
  pixel_id?: string;
  /** ISO date string. Default: 30 days ago. */
  since?: string;
  /** ISO date string. Default: now. */
  until?: string;
  variant?: "ecommerce" | "lead";
}): Promise<FunnelData[]> {
  const admin = createAdminClient();
  const since =
    args.since ?? new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const until = args.until ?? new Date().toISOString();
  const funnel = args.variant === "lead" ? LEAD_FUNNEL : STANDARD_FUNNEL;

  /* Liste des pixels du compte. */
  let pixelQuery = admin
    .from("ads_pixels")
    .select("id, name")
    .eq("ad_account_id", args.ad_account_id);
  if (args.pixel_id) pixelQuery = pixelQuery.eq("id", args.pixel_id);
  const { data: pixels } = await pixelQuery;
  if (!pixels || pixels.length === 0) return [];

  const results: FunnelData[] = [];

  for (const pixel of pixels) {
    /* Récup events agrégés par event_name pour ce pixel. */
    const { data: events } = await admin
      .from("ad_conversions")
      .select("event_name, custom_data")
      .eq("pixel_id", pixel.id)
      .eq("is_invalid", false)
      .gte("created_at", since)
      .lte("created_at", until)
      .limit(50_000);

    const counts = new Map<string, number>();
    let totalValue = 0;
    for (const e of events ?? []) {
      counts.set(e.event_name, (counts.get(e.event_name) ?? 0) + 1);
      const cd = e.custom_data as { value?: number } | null;
      if (cd?.value) totalValue += Number(cd.value);
    }

    const steps: FunnelStep[] = [];
    let prevCount: number | null = null;
    let topCount: number | null = null;

    for (const f of funnel) {
      const c = counts.get(f.event_name) ?? 0;
      if (topCount === null) topCount = c;
      const stepRate =
        prevCount !== null && prevCount > 0 ? c / prevCount : null;
      const dropOff = stepRate !== null ? 1 - stepRate : null;
      const totalRate =
        topCount !== null && topCount > 0 ? c / topCount : null;
      steps.push({
        event_name: f.event_name,
        label: f.label,
        count: c,
        step_conversion_rate: stepRate,
        drop_off_rate: dropOff,
        total_conversion_rate: totalRate,
      });
      prevCount = c;
    }

    /* Edges Sankey : flux conservés entre chaque étape. */
    const flows: FunnelData["flows"] = [];
    for (let i = 0; i < steps.length - 1; i++) {
      const from = steps[i]!;
      const to = steps[i + 1]!;
      flows.push({
        from: from.event_name,
        to: to.event_name,
        count: Math.min(from.count, to.count),
      });
    }

    results.push({
      pixel_id: pixel.id,
      pixel_name: pixel.name,
      steps,
      total_value: totalValue,
      flows,
    });
  }

  return results;
}
