import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import type { ModerationCategory } from "@/lib/database.types";

/* Scan texte via OpenAI Moderation API.
 *
 * Modèle : omni-moderation-latest (multilingue natif, FR excellent,
 * gratuit pour les usagers OpenAI au moment de la rédaction).
 *
 * Output OpenAI :
 *   categories : { harassment, hate, self-harm, sexual, violence,
 *                  harassment/threatening, hate/threatening,
 *                  self-harm/intent, self-harm/instructions,
 *                  sexual/minors, violence/graphic }
 *   category_scores : floats 0..1 par catégorie
 *
 * On mappe vers la taxonomie DIVARC (ModerationCategory) avec des
 * seuils différenciés. Cache de 30 jours sur SHA-256 du texte
 * normalisé pour éviter de re-scanner le même contenu.
 *
 * Side-effects : insert moderation_text_cache. Pas d'action sur
 * moderation_actions ici — c'est le caller (route handler de publication
 * ou cron deep_scan) qui décide quoi faire avec le résultat.
 */

export type TextScanCategory =
  | "harassment"
  | "harassment/threatening"
  | "hate"
  | "hate/threatening"
  | "self-harm"
  | "self-harm/intent"
  | "self-harm/instructions"
  | "sexual"
  | "sexual/minors"
  | "violence"
  | "violence/graphic";

export type TextScanResult = {
  flagged: boolean;
  category_scores: Record<TextScanCategory, number>;
  highest_score: number;
  detected_categories: ModerationCategory[];
  /** Décision finale recommandée ("allow" / "review" / "block"). */
  recommendation: "allow" | "review" | "block";
  /** Diagnostique pour audit log — raison textuelle. */
  rationale: string;
  cached: boolean;
};

/* Seuils par catégorie. Calibrés conservateur (peu de blocs auto, plus
 * de holds). Les modos arbitrent en review. */
const THRESHOLDS = {
  block: {
    "sexual/minors": 0.5, // tolérance zéro
    "self-harm/instructions": 0.85,
    "harassment/threatening": 0.85,
    "hate/threatening": 0.85,
    "violence/graphic": 0.9,
  } as Partial<Record<TextScanCategory, number>>,
  review: {
    harassment: 0.7,
    hate: 0.7,
    "self-harm": 0.6,
    "self-harm/intent": 0.5,
    sexual: 0.85,
    violence: 0.7,
  } as Partial<Record<TextScanCategory, number>>,
};

/* Mapping OpenAI category → ModerationCategory DIVARC. */
const CATEGORY_MAP: Record<TextScanCategory, ModerationCategory> = {
  harassment: "harassment",
  "harassment/threatening": "harassment",
  hate: "hate_speech",
  "hate/threatening": "hate_speech",
  "self-harm": "self_harm",
  "self-harm/intent": "self_harm",
  "self-harm/instructions": "self_harm",
  sexual: "nudity_sexual",
  "sexual/minors": "child_safety",
  violence: "violence",
  "violence/graphic": "violence",
};

export async function scanText(text: string): Promise<TextScanResult | null> {
  if (!text || text.trim().length < 3) return null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[moderation:scanText] OPENAI_API_KEY missing — skipping scan");
    return null;
  }

  const normalized = normalizeText(text);
  const hash = sha256(normalized);

  /* Cache lookup. */
  const admin = createAdminClient();
  const { data: cached } = await admin
    .from("moderation_text_cache")
    .select("scan_result, detected_categories, highest_score, scanned_at")
    .eq("text_hash", hash)
    .maybeSingle();

  if (cached) {
    const ageDays =
      (Date.now() - new Date(cached.scanned_at).getTime()) /
      (1000 * 60 * 60 * 24);
    if (ageDays < 30) {
      const stored = cached.scan_result as TextScanResult;
      return { ...stored, cached: true };
    }
  }

  /* OpenAI call. */
  let response: Response;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 5000);
    response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: normalized,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    console.error("[moderation:scanText] fetch failed:", err);
    return null;
  }

  if (!response.ok) {
    console.error(
      "[moderation:scanText] HTTP",
      response.status,
      await response.text().catch(() => ""),
    );
    return null;
  }

  const json = (await response.json()) as {
    results: Array<{
      flagged: boolean;
      categories: Record<string, boolean>;
      category_scores: Record<string, number>;
    }>;
  };
  const result = json.results?.[0];
  if (!result) return null;

  const scores = result.category_scores as Record<TextScanCategory, number>;

  /* Decision logic. */
  let recommendation: TextScanResult["recommendation"] = "allow";
  const detected: Set<ModerationCategory> = new Set();
  let highestScore = 0;
  let rationale = "";

  for (const [cat, score] of Object.entries(scores) as Array<
    [TextScanCategory, number]
  >) {
    if (score > highestScore) highestScore = score;
    const blockT = THRESHOLDS.block[cat];
    const reviewT = THRESHOLDS.review[cat];
    if (blockT !== undefined && score >= blockT) {
      detected.add(CATEGORY_MAP[cat]);
      if (recommendation !== "block") {
        recommendation = "block";
        rationale = `${cat}=${score.toFixed(3)} ≥ block threshold ${blockT}`;
      }
    } else if (reviewT !== undefined && score >= reviewT) {
      detected.add(CATEGORY_MAP[cat]);
      if (recommendation === "allow") {
        recommendation = "review";
        rationale = `${cat}=${score.toFixed(3)} ≥ review threshold ${reviewT}`;
      }
    }
  }
  if (rationale === "") rationale = "Tous les scores sous seuils.";

  const out: TextScanResult = {
    flagged: result.flagged,
    category_scores: scores,
    highest_score: highestScore,
    detected_categories: Array.from(detected),
    recommendation,
    rationale,
    cached: false,
  };

  /* Cache write. */
  await admin.from("moderation_text_cache").upsert({
    text_hash: hash,
    scan_result: out as unknown as Record<string, unknown>,
    detected_categories: Array.from(detected) as unknown as string[],
    highest_score: highestScore,
  });

  return out;
}

function normalizeText(t: string): string {
  /* Normalisation Unicode + lowercase + trim de l'espace excessif.
     On garde les emojis et caractères spéciaux car ils ont du sens
     pour la modération (notamment OpenAI les comprend). */
  return t.normalize("NFKC").trim().slice(0, 8000);
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
