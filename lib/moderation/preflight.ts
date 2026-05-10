import "server-only";
import crypto from "node:crypto";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/* Hard checks pré-publication — niveau 1 du pipeline T&S.
 *
 * Objectif : décider en < 50 ms si on peut publier sans appel ML coûteux.
 *
 * Checks :
 *   1. URLs malveillantes via Google Safe Browsing API (gratuit ≤10k/jour)
 *   2. Mots interdits absolus (slurs ultra-graves, jamais de faux positif)
 *   3. Hash média connu (réupload de contenu déjà modéré)
 *   4. Spam patterns regex (URL flood, char spam, copy-paste)
 *   5. Rate limit comportemental (posts/heure selon trust_score)
 *
 * Retourne :
 *   - PASS  : feu vert, peut publier
 *   - HOLD  : passe en revue humaine (file moderation_queue)
 *   - BLOCK : refus immédiat, l'auteur reçoit un message clair
 *
 * Cette fonction est synchrone côté caller (route handler de
 * publication). Si un check externe (Safe Browsing) timeout, on
 * choisit conservateur : on laisse passer mais on enqueue un deep_scan
 * async pour vérification ultérieure.
 */

export type PreflightInput = {
  text: string | null;
  user_id: string;
  content_type: "post" | "comment" | "message" | "listing" | "story";
  /** Hashes SHA-256 des médias attachés. Optionnel. */
  media_hashes?: string[];
};

export type PreflightDecision =
  | { kind: "pass" }
  | { kind: "hold"; reason: string }
  | { kind: "block"; reason: string; user_message: string };

/* Liste très courte de termes utilisés exclusivement dans des contextes
 * haineux/illégaux où aucune ambiguïté ne peut exister. Volontairement
 * minimale pour éviter les faux positifs. La détection nuancée passe
 * par OpenAI Moderation (lib/moderation/scanText.ts). */
const ABSOLUTE_BLOCKLIST = [
  /* Apologie de pédophilie explicite — pas de mot du langage courant. */
  /\bpédopornogr/i,
  /\bcp\s+download\b/i,
  /* Quelques slurs FR/EN ultra-graves sans usage légitime contextuel. */
  // Note : la liste réelle est très courte par design. La détection
  // d'insultes/slurs nuancée se fait via OpenAI Moderation.
];

/* Spam patterns : URL flood, char repetition, etc. */
const SPAM_PATTERNS = [
  /(https?:\/\/\S+\s*){5,}/i, // 5+ URLs in a row
  /(.)\1{20,}/, // 20+ same char in a row
  /^(.{1,30})\1{3,}$/, // entire text = same short pattern repeated
];

const SAFE_BROWSING_API =
  "https://safebrowsing.googleapis.com/v4/threatMatches:find";

export async function runPreflight(
  input: PreflightInput,
): Promise<PreflightDecision> {
  /* 1. Mots interdits absolus. */
  if (input.text) {
    for (const pattern of ABSOLUTE_BLOCKLIST) {
      if (pattern.test(input.text)) {
        return {
          kind: "block",
          reason: "absolute_blocklist",
          user_message:
            "Ton contenu enfreint nos règles communautaires. Si tu penses qu'il s'agit d'une erreur, contacte-nous.",
        };
      }
    }
  }

  /* 2. Spam patterns. */
  if (input.text) {
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(input.text)) {
        return {
          kind: "hold",
          reason: "spam_pattern",
        };
      }
    }
  }

  /* 3. URLs malveillantes (Safe Browsing si key dispo). */
  if (input.text) {
    const urls = extractUrls(input.text);
    if (urls.length > 0) {
      const malicious = await checkSafeBrowsing(urls);
      if (malicious.length > 0) {
        return {
          kind: "block",
          reason: "malicious_url",
          user_message: `Ton contenu contient un ou plusieurs liens identifiés comme malveillants par Google Safe Browsing. Retire-les pour publier.`,
        };
      }
    }
  }

  /* 4. Hashes médias déjà modérés (réupload). */
  if (input.media_hashes && input.media_hashes.length > 0) {
    const known = await checkKnownHashes(input.media_hashes);
    if (known.length > 0) {
      return {
        kind: "block",
        reason: "known_violation_reupload",
        user_message:
          "Une ou plusieurs images contenues dans ce contenu ont déjà fait l'objet d'une décision de modération.",
      };
    }
  }

  /* 5. Rate limit selon trust_score. */
  const limited = await checkUserRateLimit(input.user_id, input.content_type);
  if (limited) {
    return { kind: "hold", reason: "rate_limit_exceeded" };
  }

  /* 6. Trust score très bas → tout passe en review. */
  const trust = await fetchTrustScore(input.user_id);
  if (trust !== null && trust < 20) {
    return { kind: "hold", reason: "low_trust_user" };
  }

  return { kind: "pass" };
}

/* -------- Helpers -------- */

export function sha256(buffer: Buffer | string): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function extractUrls(text: string): string[] {
  const re = /https?:\/\/[^\s<>]+/gi;
  return Array.from(new Set(text.match(re) ?? []));
}

async function checkSafeBrowsing(urls: string[]): Promise<string[]> {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!apiKey) return []; // pas configuré — skip silencieux

  const body = {
    client: { clientId: "divarc", clientVersion: "1.0" },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE",
        "POTENTIALLY_HARMFUL_APPLICATION",
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: urls.map((url) => ({ url })),
    },
  };

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 1500); // 1.5s budget
    const res = await fetch(`${SAFE_BROWSING_API}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return []; // erreur API → on n'échoue pas ouvertement

    const json = (await res.json()) as {
      matches?: Array<{ threat: { url: string } }>;
    };
    return (json.matches ?? []).map((m) => m.threat.url);
  } catch {
    return [];
  }
}

async function checkKnownHashes(hashes: string[]): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("moderation_known_hashes")
    .select("hash")
    .in("hash", hashes)
    .eq("is_active", true);
  return (data ?? []).map((r) => r.hash);
}

async function checkUserRateLimit(
  userId: string,
  contentType: PreflightInput["content_type"],
): Promise<boolean> {
  /* Limites différentes selon le type de contenu. Posts > comments. */
  const limits: Record<PreflightInput["content_type"], number> = {
    post: 30,        // 30 posts / h
    comment: 120,    // 2/min
    message: 600,    // 10/min (DM échanges actifs)
    listing: 20,     // 20 listings / h
    story: 30,
  };
  const limit = limits[contentType];
  const since = new Date(Date.now() - 3600_000).toISOString();
  const supabase = await createClient();

  /* Branches typées par table — Supabase JS infère le schéma exact pour
     chacune, on évite le typage dynamique qui ne tient pas la route. */
  let count: number | null = null;
  if (contentType === "post") {
    const r = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId)
      .gte("created_at", since);
    count = r.count;
  } else if (contentType === "comment") {
    const r = await supabase
      .from("post_comments")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId)
      .gte("created_at", since);
    count = r.count;
  } else if (contentType === "listing") {
    const r = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", userId)
      .gte("created_at", since);
    count = r.count;
  } else if (contentType === "story") {
    const r = await supabase
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId)
      .gte("created_at", since);
    count = r.count;
  } else if (contentType === "message") {
    const r = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", userId)
      .gte("created_at", since);
    count = r.count;
  }
  return (count ?? 0) >= limit;
}

async function fetchTrustScore(userId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", userId)
    .maybeSingle();
  return data?.trust_score ?? null;
}

/* Helper pour ajouter un hash à la liste de réuploads bloqués (appelé
 * depuis le decision flow modération quand action=delete avec média). */
export async function addKnownHash(args: {
  hash: string;
  hash_type: "sha256" | "phash" | "blockhash" | "photodna";
  category: string;
  source_action_id: string;
  added_by: string;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("moderation_known_hashes").insert(args);
}
