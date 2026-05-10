import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { runPreflight, type PreflightDecision } from "./preflight";
import { scanText, type TextScanResult } from "./scanText";
import { scanImage, type ImageScanResult } from "./scanImage";
import type { ModerationCategory } from "@/lib/database.types";

/* Pipeline pré-publication unifié.
 *
 * Combine :
 *   1. Hard checks (URLs/hashes/regex/rate limits) — synchrone < 50 ms
 *   2. ML texte (OpenAI Moderation)               — synchrone < 500 ms
 *   3. ML images (OpenAI Vision)                  — synchrone < 1500 ms
 *
 * Total budget : ~2 s p95. Au-delà, le caller choisit timeout et fallback
 * sur "publish + deep_scan async".
 *
 * Le caller (server action createPost / createComment / etc.) appelle :
 *
 *   const decision = await runPipeline({ user_id, text, content_type });
 *   if (decision.kind === "block") return { ok: false, error: decision.user_message };
 *   if (decision.kind === "hold")  // enqueue + retourner état "en revue"
 *   // sinon publish normalement
 *
 * Si la décision est "publish_with_signals", on publie ET on enqueue
 * un deep_scan en background (vidéo, OCR, behavioral).
 */

export type PipelineInput = {
  user_id: string;
  content_type: "post" | "comment" | "message" | "listing" | "story";
  /** Texte primaire (post body, comment body, message body, listing
   *  title+description, story caption). */
  text: string | null;
  /** URLs publiques des médias attachés. */
  media_urls?: string[];
  /** Hashes SHA-256 des médias (calculés en amont par l'uploader). */
  media_hashes?: string[];
};

export type PipelineDecision =
  | { kind: "publish"; signals: PipelineSignals }
  | { kind: "publish_with_review"; signals: PipelineSignals; reason: string }
  | { kind: "hold"; signals: PipelineSignals; reason: string }
  | {
      kind: "block";
      signals: PipelineSignals;
      reason: string;
      user_message: string;
    };

export type PipelineSignals = {
  preflight: PreflightDecision;
  text_scan?: TextScanResult | null;
  image_scans?: Array<ImageScanResult | null>;
  /** Catégorie consolidée pour pré-tagger l'incident si bloqué. */
  primary_category: ModerationCategory | null;
};

export async function runPipeline(
  input: PipelineInput,
): Promise<PipelineDecision> {
  /* 1. Hard checks. */
  const preflight = await runPreflight({
    text: input.text,
    user_id: input.user_id,
    content_type: input.content_type,
    media_hashes: input.media_hashes,
  });

  if (preflight.kind === "block") {
    return {
      kind: "block",
      signals: { preflight, primary_category: null },
      reason: preflight.reason,
      user_message: preflight.user_message,
    };
  }
  if (preflight.kind === "hold") {
    return {
      kind: "hold",
      signals: { preflight, primary_category: null },
      reason: preflight.reason,
    };
  }

  /* 2. ML texte (en parallèle avec ML images). */
  const textPromise = input.text
    ? scanText(input.text)
    : Promise.resolve(null);

  /* 3. ML images. */
  const imagePromises = (input.media_urls ?? []).map((url, i) =>
    scanImage({ image_url: url, image_hash: input.media_hashes?.[i] }),
  );

  const [textScan, ...imageScans] = await Promise.all([
    textPromise,
    ...imagePromises,
  ]);

  const signals: PipelineSignals = {
    preflight,
    text_scan: textScan,
    image_scans: imageScans,
    primary_category: detectPrimaryCategory(textScan, imageScans),
  };

  /* Décision finale : prend la pire des recommandations. */
  if (textScan?.recommendation === "block") {
    return {
      kind: "block",
      signals,
      reason: `text:${textScan.rationale}`,
      user_message:
        "Ton contenu enfreint nos règles communautaires (détecté automatiquement). Si tu penses qu'il s'agit d'une erreur, modifie ton message ou contacte l'équipe.",
    };
  }
  for (const r of imageScans) {
    if (r?.recommendation === "block") {
      return {
        kind: "block",
        signals,
        reason: `image:${r.rationale}`,
        user_message:
          "Une ou plusieurs images de ton contenu enfreignent nos règles communautaires (détecté automatiquement).",
      };
    }
  }

  if (textScan?.recommendation === "review") {
    return {
      kind: "publish_with_review",
      signals,
      reason: `text:${textScan.rationale}`,
    };
  }
  for (const r of imageScans) {
    if (r?.recommendation === "review") {
      return {
        kind: "publish_with_review",
        signals,
        reason: `image:${r.rationale}`,
      };
    }
  }

  return { kind: "publish", signals };
}

function detectPrimaryCategory(
  textScan: TextScanResult | null,
  imageScans: Array<ImageScanResult | null>,
): ModerationCategory | null {
  /* Hiérarchie : child_safety > self_harm > violence > hate_speech
     > harassment > nudity_sexual > privacy > spam > other. */
  const order: ModerationCategory[] = [
    "child_safety",
    "self_harm",
    "violence",
    "hate_speech",
    "harassment",
    "nudity_sexual",
    "privacy",
    "scam_fraud",
    "spam",
    "other",
  ];
  const all: Set<ModerationCategory> = new Set();
  for (const c of textScan?.detected_categories ?? []) all.add(c);
  for (const r of imageScans) {
    for (const c of r?.detected_categories ?? []) all.add(c);
  }
  for (const c of order) if (all.has(c)) return c;
  return null;
}

/* Helper pour enqueue un deep_scan asynchrone (vidéos, OCR, audio,
 * behavioral). Appelé après publish_with_review pour analyse plus
 * poussée que le scan synchrone. */
export async function enqueueDeepScan(args: {
  content_type: PipelineInput["content_type"];
  content_id: string;
  signals: PipelineSignals;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("moderation_queue").insert({
    job_type: "deep_scan",
    payload: {
      content_type: args.content_type,
      content_id: args.content_id,
      preliminary_category: args.signals.primary_category,
    },
    priority: 50,
  });
}
