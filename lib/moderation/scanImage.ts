import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import type { ModerationCategory } from "@/lib/database.types";

/* Scan image via OpenAI gpt-4o-mini Vision.
 *
 * Stratégie : prompt structuré demandant un JSON strict avec scores
 * par catégorie. C'est plus économique et fiable qu'un appel par
 * catégorie séparée. Coût : ~0.0001-0.0005€ par image low-detail.
 *
 * Pour les CAS CRITIQUES (CSAM), OpenAI Vision N'EST PAS suffisant —
 * la détection PhotoDNA via Microsoft est obligatoire. Le scan ici
 * peut flaguer un signal "minor present" qui déclenche le scan
 * PhotoDNA dédié dans lib/moderation/csam.ts.
 *
 * Cache 30 jours sur SHA-256 du fichier. Pour les vidéos, le caller
 * doit passer plusieurs frames (1 par seconde) — chaque frame
 * indépendamment scannée et cachée.
 */

export type ImageScanResult = {
  /** [0..1] probabilité contenu sexuel/nu adult. */
  nsfw: number;
  /** [0..1] violence visible (sang, blessures, armes en action). */
  violence: number;
  /** [0..1] présence d'arme à feu visible. */
  weapons: number;
  /** [0..1] estimation visage mineur visible (signal complémentaire CSAM). */
  minor_present: number;
  /** [0..1] document d'identité visible (fuite PII). */
  id_document: number;
  /** [0..1] symbole haineux ou drapeau extrémiste. */
  hate_symbol: number;
  /** Description courte du contenu (utile pour audit). */
  description: string;
  /** Recommandation finale. */
  recommendation: "allow" | "review" | "block";
  detected_categories: ModerationCategory[];
  /** Diagnostique. */
  rationale: string;
  cached: boolean;
};

const VISION_PROMPT = `Tu es un système de modération de contenu pour une plateforme sociale française. Analyse cette image et retourne un JSON STRICT (pas de markdown, pas de commentaire) avec ce format exact :

{
  "nsfw": 0.0-1.0,
  "violence": 0.0-1.0,
  "weapons": 0.0-1.0,
  "minor_present": 0.0-1.0,
  "id_document": 0.0-1.0,
  "hate_symbol": 0.0-1.0,
  "description": "Description neutre de 1-2 phrases en français."
}

Critères :
- nsfw : nudité, contenu sexuel explicite. Maillot de bain ou sport = bas score.
- violence : sang, blessures, agression visible. Sport de combat encadré = bas score.
- weapons : armes à feu, armes blanches en posture menaçante. Outils/cuisine = bas score.
- minor_present : visage clairement enfantin (<16 ans). Photo de famille saine = score modéré pour signaler la présence (pas pour bloquer).
- id_document : carte d'identité, passeport, permis lisibles.
- hate_symbol : croix gammée, drapeaux/symboles d'organisations terroristes ou suprémacistes.

Sois précis et conservateur sur les bas scores. Mieux vaut un faux positif (review humaine) qu'un faux négatif.`;

const THRESHOLDS = {
  block: {
    nsfw: 0.9,
    violence: 0.92,
    weapons: 0.92,
    hate_symbol: 0.85,
  },
  review: {
    nsfw: 0.65,
    violence: 0.65,
    weapons: 0.6,
    minor_present: 0.7,
    id_document: 0.7,
    hate_symbol: 0.5,
  },
};

const CATEGORY_MAP: Record<keyof typeof THRESHOLDS.review, ModerationCategory> =
  {
    nsfw: "nudity_sexual",
    violence: "violence",
    weapons: "violence",
    minor_present: "child_safety",
    id_document: "privacy",
    hate_symbol: "hate_speech",
  };

export async function scanImage(args: {
  /** URL publique de l'image (Supabase Storage public bucket). */
  image_url: string;
  /** SHA-256 du fichier (calculé en amont par le uploader). */
  image_hash?: string;
}): Promise<ImageScanResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[moderation:scanImage] OPENAI_API_KEY missing");
    return null;
  }

  const hash = args.image_hash ?? sha256(args.image_url);

  /* Cache lookup. */
  const admin = createAdminClient();
  const { data: cached } = await admin
    .from("moderation_image_cache")
    .select("scan_result, scanned_at")
    .eq("image_hash", hash)
    .maybeSingle();
  if (cached) {
    const ageDays =
      (Date.now() - new Date(cached.scanned_at).getTime()) /
      (1000 * 60 * 60 * 24);
    if (ageDays < 30) {
      const stored = cached.scan_result as ImageScanResult;
      return { ...stored, cached: true };
    }
  }

  /* Vision API call. */
  let response: Response;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: VISION_PROMPT },
              {
                type: "image_url",
                image_url: { url: args.image_url, detail: "low" },
              },
            ],
          },
        ],
        max_tokens: 200,
        temperature: 0,
        response_format: { type: "json_object" },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    console.error("[moderation:scanImage] fetch failed:", err);
    return null;
  }

  if (!response.ok) {
    console.error(
      "[moderation:scanImage] HTTP",
      response.status,
      await response.text().catch(() => ""),
    );
    return null;
  }

  const json = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) return null;

  let parsed: Partial<ImageScanResult>;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    console.error("[moderation:scanImage] JSON parse failed:", content);
    return null;
  }

  const scores = {
    nsfw: clamp01(parsed.nsfw),
    violence: clamp01(parsed.violence),
    weapons: clamp01(parsed.weapons),
    minor_present: clamp01(parsed.minor_present),
    id_document: clamp01(parsed.id_document),
    hate_symbol: clamp01(parsed.hate_symbol),
  };

  /* Decision logic. */
  let recommendation: ImageScanResult["recommendation"] = "allow";
  const detected: Set<ModerationCategory> = new Set();
  let rationale = "";
  for (const [k, score] of Object.entries(scores) as Array<
    [keyof typeof THRESHOLDS.review, number]
  >) {
    const blockT = (THRESHOLDS.block as Record<string, number>)[k];
    const reviewT = THRESHOLDS.review[k];
    if (blockT !== undefined && score >= blockT) {
      detected.add(CATEGORY_MAP[k]);
      if (recommendation !== "block") {
        recommendation = "block";
        rationale = `${k}=${score.toFixed(3)} ≥ block ${blockT}`;
      }
    } else if (reviewT !== undefined && score >= reviewT) {
      detected.add(CATEGORY_MAP[k]);
      if (recommendation === "allow") {
        recommendation = "review";
        rationale = `${k}=${score.toFixed(3)} ≥ review ${reviewT}`;
      }
    }
  }
  if (rationale === "") rationale = "Tous les scores sous seuils.";

  const out: ImageScanResult = {
    ...scores,
    description: parsed.description ?? "",
    recommendation,
    detected_categories: Array.from(detected),
    rationale,
    cached: false,
  };

  /* Cache write. */
  await admin.from("moderation_image_cache").upsert({
    image_hash: hash,
    scan_result: out as unknown as Record<string, unknown>,
    nsfw_score: scores.nsfw,
    violence_score: scores.violence,
    csam_match: false, // PhotoDNA only
  });

  return out;
}

function clamp01(v: unknown): number {
  const n = typeof v === "number" ? v : 0;
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
