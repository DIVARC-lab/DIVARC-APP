import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { scanText } from "@/lib/moderation/scanText";
import { scanImage } from "@/lib/moderation/scanImage";
import {
  ALWAYS_FORBIDDEN_AD_CATEGORIES,
  AGE_GATED_18PLUS_CATEGORIES,
  REQUIRES_CERTIFICATION_CATEGORIES,
  CATEGORY_DISCLAIMERS,
} from "./types";
import type { AdsAd, AdsCreative } from "@/lib/database.types";

/* Pipeline de revue d'ad — réutilise lib/moderation/.
 *
 * Niveaux :
 *   1. Auto-approval (90% des ads, < 30s) :
 *      - catégorie OK + scanText OK + scanImage OK + URL OK
 *      → review_status = 'auto_approved'
 *
 *   2. Auto-hold (catégories sensibles, review humaine) :
 *      - alcool, paris ANJ, finance_credit, immobilier, sante_para,
 *        juridique → review_status = 'pending', humain valide manuellement
 *      - Ou si scanText/scanImage en review → idem
 *
 *   3. Auto-rejection :
 *      - catégorie ALWAYS_FORBIDDEN → review_status = 'rejected'
 *      - scanText.recommendation = 'block' → idem
 *      - scanImage.recommendation = 'block' → idem
 *
 *   4. Re-review post-publication (cron + signal feedback négatif) :
 *      - 5% sample aléatoire des auto_approved
 *      - Si total_impressions > 1000 et observed_ctr < threshold/2 → re_review
 *      - Si signaux dans ad_reports → re_review
 */

export type AdReviewResult = {
  decision: "auto_approved" | "pending" | "rejected" | "limited";
  reason: string;
  category_detected?: string;
  auto_disclaimer?: string;
  /* Diagnostique pour audit trail. */
  scan_summary: {
    text?: { recommendation: string; rationale: string };
    image?: { recommendation: string; rationale: string };
  };
};

export async function reviewAd(
  ad: AdsAd,
  creative: AdsCreative,
): Promise<AdReviewResult> {
  /* 1. Catégorie : on l'extrait depuis le primary_text/headline/description
     via heuristique simple (V1) ou LLM (V2). Pour V1 : on fait confiance
     au flag ad_category_hint si fourni à la création, sinon on fait du
     keyword matching basique. */
  const fullText = [
    creative.primary_text,
    creative.headline,
    creative.description ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const detectedCategory = detectCategory(fullText);

  /* 2. Catégorie ALWAYS_FORBIDDEN → reject. */
  if (
    detectedCategory &&
    (ALWAYS_FORBIDDEN_AD_CATEGORIES as readonly string[]).includes(
      detectedCategory,
    )
  ) {
    return {
      decision: "rejected",
      reason: `Catégorie interdite : ${detectedCategory}`,
      category_detected: detectedCategory,
      scan_summary: {},
    };
  }

  /* 3. Catégorie REQUIRES_CERTIFICATION ou AGE_GATED → hold humain. */
  let needsHumanReview = false;
  if (detectedCategory) {
    if (
      (REQUIRES_CERTIFICATION_CATEGORIES as readonly string[]).includes(
        detectedCategory,
      )
    ) {
      needsHumanReview = true;
    }
    if (
      (AGE_GATED_18PLUS_CATEGORIES as readonly string[]).includes(detectedCategory)
    ) {
      /* Age-gated : on tolère l'auto-approval mais on enforce le
         disclaimer. Pour la 1ère ad d'un secteur, on peut basculer en
         hold humain si KYB pas encore complet. V1 : laisse passer. */
    }
  }

  /* 4. Scan texte (réutilise lib/moderation/scanText.ts). */
  const textScan = await scanText(fullText);
  const scanSummary: AdReviewResult["scan_summary"] = {};
  if (textScan) {
    scanSummary.text = {
      recommendation: textScan.recommendation,
      rationale: textScan.rationale,
    };
    if (textScan.recommendation === "block") {
      return {
        decision: "rejected",
        reason: `Texte non conforme : ${textScan.rationale}`,
        category_detected: detectedCategory ?? undefined,
        scan_summary: scanSummary,
      };
    }
    if (textScan.recommendation === "review") {
      needsHumanReview = true;
    }
  }

  /* 5. Scan image (réutilise lib/moderation/scanImage.ts). */
  if (creative.media_url) {
    const imageScan = await scanImage({
      image_url: creative.media_url,
      image_hash: creative.media_sha256 ?? undefined,
    });
    if (imageScan) {
      scanSummary.image = {
        recommendation: imageScan.recommendation,
        rationale: imageScan.rationale,
      };
      if (imageScan.recommendation === "block") {
        return {
          decision: "rejected",
          reason: `Image non conforme : ${imageScan.rationale}`,
          category_detected: detectedCategory ?? undefined,
          scan_summary: scanSummary,
        };
      }
      if (imageScan.recommendation === "review") {
        needsHumanReview = true;
      }
    }
  }

  /* 6. Disclaimer auto si catégorie réglementée. */
  const autoDisclaimer = detectedCategory
    ? CATEGORY_DISCLAIMERS[detectedCategory]
    : undefined;

  /* 7. Décision. */
  if (needsHumanReview) {
    return {
      decision: "pending",
      reason: "Catégorie sensible ou scan ML en revue — humain requis",
      category_detected: detectedCategory ?? undefined,
      auto_disclaimer: autoDisclaimer,
      scan_summary: scanSummary,
    };
  }

  return {
    decision: "auto_approved",
    reason: "Tous les checks passent",
    category_detected: detectedCategory ?? undefined,
    auto_disclaimer: autoDisclaimer,
    scan_summary: scanSummary,
  };
}

/* Heuristique simple V1 — keyword matching FR/EN par catégorie.
 * V2 : classifier ML (LightGBM ou OpenAI fine-tuned) sur dataset DIVARC. */
function detectCategory(text: string): string | null {
  const patterns: Record<string, RegExp[]> = {
    tabac_cigarettes: [/\b(cigarette|tabac|cigare|vapotage|e-cig)\b/],
    drogues_illegales: [/\b(cocaïne|héroïne|cannabis légalisé seulement)\b/],
    paris_sportifs_non_anj: [/\b(paris sportifs?\b(?!.*ANJ))\b/],
    paris_sportifs_anj: [/\bparis? sportifs?\b.*\b(ANJ|agréé)\b/],
    alcool: [/\b(vin|bière|whisky|rhum|champagne|spiritueux|alcool)\b/],
    finance_credit: [
      /\b(crédit|prêt|emprunt|taux|finance personnelle|trader|trading)\b/,
    ],
    assurance: [/\b(assurance|mutuelle|responsabilité civile)\b/],
    immobilier: [/\b(immobilier|appartement|maison|location|achat immobilier)\b/],
    sante_para_medical: [/\b(médical|thérapie|ostéopathe|kinésithérapeute|psy)\b/],
    juridique: [/\b(avocat|juridique|tribunal|conseil juridique)\b/],
    medicaments_prescription: [/\b(ordonnance|médicament prescrit)\b/],
    chirurgie_esthetique_non_regulee: [
      /\b(chirurgie esthétique|botox|liposuccion)\b/,
    ],
    amaigrissement_promesses_miracles: [
      /\b(perdre \d+ kilos en|maigrir vite|miracle minceur)\b/,
    ],
  };

  for (const [cat, regs] of Object.entries(patterns)) {
    for (const r of regs) {
      if (r.test(text)) return cat;
    }
  }
  return null;
}

/* Helper : applique le résultat de review à l'ad en DB.
 * Appelé depuis le cron ad-review ou le decision flow. */
export async function applyAdReview(
  adId: string,
  result: AdReviewResult,
  reviewerId: string | null,
): Promise<void> {
  const admin = createAdminClient();
  const updates: {
    review_status: AdsAd["review_status"];
    review_feedback: string;
    reviewed_at: string;
    reviewed_by: string | null;
    status?: AdsAd["status"];
  } = {
    review_status: result.decision === "auto_approved"
      ? "auto_approved"
      : result.decision === "rejected"
        ? "rejected"
        : "pending",
    review_feedback: result.reason,
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewerId,
  };

  /* Si rejected, on force status=rejected pour empêcher la diffusion. */
  if (result.decision === "rejected") {
    updates.status = "rejected";
  }

  await admin.from("ads_ads").update(updates).eq("id", adId);

  /* Si on a détecté un disclaimer auto, on le pousse sur la creative. */
  if (result.auto_disclaimer) {
    const { data: ad } = await admin
      .from("ads_ads")
      .select("creative_id")
      .eq("id", adId)
      .maybeSingle();
    if (ad) {
      await admin
        .from("ads_creatives")
        .update({ auto_disclaimer: result.auto_disclaimer })
        .eq("id", ad.creative_id);
    }
  }
}
