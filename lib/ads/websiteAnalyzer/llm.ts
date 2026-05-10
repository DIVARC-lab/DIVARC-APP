import "server-only";
import type { ExtractedData } from "./extractor";

/* LLM wrappers pour le Website Analyzer.
 *
 * Modèle : OpenAI gpt-4o-mini (économique, ~0.15€/M tokens, JSON mode
 * structured outputs supporté).
 *
 * 4 appels max par analyse :
 *   1. classify_business : extrait business_name, category, audience inferée
 *   2. generate_keywords : 30 keywords primaires + 20 secondaires + 10 négatifs
 *   3. generate_audiences : 3-5 personas avec targeting_spec
 *   4. generate_copy : 5 headlines + 5 descriptions + 5 CTAs
 *
 * Cost tracking : on retourne les tokens utilisés pour facturer.
 */

const OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

type LLMResponse<T> = {
  data: T;
  tokens_used: number;
  cost_cents: number;
};

async function callLLM<T>(args: {
  system: string;
  user: string;
  /* JSON schema strict pour structured output. */
  schema?: Record<string, unknown>;
  max_tokens?: number;
}): Promise<LLMResponse<T>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const body: Record<string, unknown> = {
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
      max_tokens: args.max_tokens ?? 2000,
      temperature: 0.7,
      response_format: args.schema
        ? {
            type: "json_schema",
            json_schema: {
              name: "analysis",
              strict: true,
              schema: args.schema,
            },
          }
        : { type: "json_object" },
    };

    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      /* Erreurs OpenAI fréquentes : on traduit en messages clairs côté
         UI plutôt que de dumper le JSON brut. */
      if (res.status === 429 && /insufficient_quota/i.test(err)) {
        throw new Error(
          "Le compte OpenAI DIVARC n'a plus de crédit disponible. Recharge le compte sur https://platform.openai.com/settings/organization/billing/overview pour relancer les analyses.",
        );
      }
      if (res.status === 429) {
        throw new Error(
          "Trop de requêtes vers OpenAI en simultané. Réessaie dans 30 secondes.",
        );
      }
      if (res.status === 401) {
        throw new Error(
          "La clé OPENAI_API_KEY est invalide ou révoquée. Contacte l'admin DIVARC.",
        );
      }
      if (res.status >= 500) {
        throw new Error(
          "OpenAI est temporairement indisponible. Réessaie dans quelques minutes.",
        );
      }
      throw new Error(`OpenAI HTTP ${res.status}: ${err.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage: { total_tokens: number; prompt_tokens: number; completion_tokens: number };
    };

    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in LLM response");

    let parsed: T;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`LLM returned invalid JSON: ${content.slice(0, 200)}`);
    }

    /* Cost : gpt-4o-mini = $0.15 / 1M input tokens + $0.60 / 1M output tokens
       Approximation simple : moyenne $0.30 / 1M tokens. EUR ≈ USD. */
    const totalTokens = json.usage?.total_tokens ?? 0;
    const costCents = (totalTokens / 1_000_000) * 30; // 0.30€/Mtok ≈ 30 cents/Mtok

    return {
      data: parsed,
      tokens_used: totalTokens,
      cost_cents: costCents,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/* ============================================================
 * 1. classify_business
 * ============================================================ */

export type BusinessClassification = {
  business_name: string;
  business_description: string;
  business_category: string[]; // ex: ["e-commerce", "mode", "femmes"]
  target_audience_inferred: string[]; // personas en 1 phrase
  primary_objective: string; // un des 14 objectifs DIVARC
  objective_alternatives: string[];
  industry_sensitive_categories: string[]; // alcool, finance, immo, etc.
};

export async function classifyBusiness(
  data: ExtractedData,
): Promise<LLMResponse<BusinessClassification>> {
  const context = buildContextString(data);

  return callLLM<BusinessClassification>({
    system: `Tu es un expert en analyse marketing et publicité digitale française.
Tu reçois des extraits structurés d'un site web (Open Graph, Schema.org, headings,
texte). Tu dois en extraire une fiche d'identité business précise.

Règles :
- business_category : 1-3 catégories du plus général au plus spécifique
  (ex: "e-commerce" > "mode" > "lingerie")
- primary_objective : choisis parmi : brand_awareness, reach, traffic,
  engagement, video_views, lead_generation, messages, conversions,
  marketplace_listing_boost, job_applications, circle_growth
- industry_sensitive_categories : si tu détectes un secteur réglementé,
  liste-le précisément : alcool, paris_sportifs, finance_credit,
  assurance, immobilier, sante_para_medical, juridique, medicaments,
  amaigrissement, chirurgie_esthetique, tabac (interdit)
- Sois factuel, pas de spéculation.`,
    user: `Voici l'analyse structurée du site web :

${context}

Extrais une fiche d'identité business précise au format JSON.`,
    schema: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        business_description: { type: "string" },
        business_category: { type: "array", items: { type: "string" } },
        target_audience_inferred: { type: "array", items: { type: "string" } },
        primary_objective: { type: "string" },
        objective_alternatives: { type: "array", items: { type: "string" } },
        industry_sensitive_categories: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: [
        "business_name",
        "business_description",
        "business_category",
        "target_audience_inferred",
        "primary_objective",
        "objective_alternatives",
        "industry_sensitive_categories",
      ],
      additionalProperties: false,
    },
  });
}

/* ============================================================
 * 2. generate_keywords
 * ============================================================ */

export type KeywordSuggestion = {
  keyword: string;
  relevance_score: number; // 0-1
  intent: "informational" | "commercial" | "transactional" | "navigational";
};

export type KeywordsResult = {
  keywords_primary: KeywordSuggestion[];
  keywords_secondary: KeywordSuggestion[];
  keywords_negative: string[];
};

export async function generateKeywords(
  classification: BusinessClassification,
  data: ExtractedData,
): Promise<LLMResponse<KeywordsResult>> {
  const context = `Business : ${classification.business_name}
Description : ${classification.business_description}
Catégories : ${classification.business_category.join(", ")}
Audience : ${classification.target_audience_inferred.join(" | ")}

Headings principaux du site :
${data.all_h1s.slice(0, 10).join("\n")}
${data.all_h2s.slice(0, 15).join("\n")}

Produits détectés : ${data.products
    .slice(0, 10)
    .map((p) => p.name)
    .join(", ")}
Services détectés : ${data.services
    .slice(0, 5)
    .map((s) => s.name)
    .join(", ")}`;

  return callLLM<KeywordsResult>({
    system: `Tu es un expert SEO/SEA et publicité digitale. Tu génères des
listes de mots-clés en français pour des campagnes Google Ads / Meta Ads.

Règles :
- keywords_primary : 30 mots-clés très pertinents et commerciaux
- keywords_secondary : 20 mots-clés associés (longue traîne, synonymes)
- keywords_negative : 10 mots-clés à exclure (faux positifs typiques)
- relevance_score : 0-1 (1 = ultra pertinent)
- intent :
    informational = recherche d'info ("qu'est-ce que")
    commercial    = comparaison, hésitation ("meilleur", "avis")
    transactional = intention d'achat ("acheter", "prix", "commander")
    navigational  = recherche de marque
- Pas de mots vides, pas de catégories sensibles (santé personnelle, etc.)`,
    user: context,
    schema: {
      type: "object",
      properties: {
        keywords_primary: {
          type: "array",
          items: {
            type: "object",
            properties: {
              keyword: { type: "string" },
              relevance_score: { type: "number" },
              intent: {
                type: "string",
                enum: ["informational", "commercial", "transactional", "navigational"],
              },
            },
            required: ["keyword", "relevance_score", "intent"],
            additionalProperties: false,
          },
        },
        keywords_secondary: {
          type: "array",
          items: {
            type: "object",
            properties: {
              keyword: { type: "string" },
              relevance_score: { type: "number" },
              intent: {
                type: "string",
                enum: ["informational", "commercial", "transactional", "navigational"],
              },
            },
            required: ["keyword", "relevance_score", "intent"],
            additionalProperties: false,
          },
        },
        keywords_negative: { type: "array", items: { type: "string" } },
      },
      required: ["keywords_primary", "keywords_secondary", "keywords_negative"],
      additionalProperties: false,
    },
    max_tokens: 3000,
  });
}

/* ============================================================
 * 3. generate_audiences (personas)
 * ============================================================ */

export type AudienceSuggestion = {
  persona_name: string;
  description: string;
  age_min: number;
  age_max: number;
  genders: string[];
  countries: string[];
  interests: string[];
  estimated_size_label: "narrow" | "medium" | "broad";
};

export async function generateAudiences(
  classification: BusinessClassification,
): Promise<LLMResponse<{ audiences: AudienceSuggestion[] }>> {
  return callLLM<{ audiences: AudienceSuggestion[] }>({
    system: `Tu es un expert en planning audience et stratégie publicitaire.
Tu génères 3 personas distincts avec targeting spec pour des campagnes
DIVARC Ads en France.

Règles :
- persona_name : court et évocateur ("Jeunes pros tech 25-34")
- age_min / age_max : 18+ obligatoire (DSA art. 28)
- genders : ["all"] | ["male"] | ["female"] | ["non_binary"]
- countries : codes ISO 3166-1 alpha-2 (FR par défaut, BE/CH/CA possible)
- interests : 5-10 slugs de centres d'intérêt en format taxonomie
  (ex: "tech.web_dev", "lifestyle.cooking", "sport.running")
- estimated_size_label : narrow (50K-500K), medium (500K-2M), broad (2M+)
- Pas de catégories RGPD sensibles (santé, religion, politique, etc.)`,
    user: `Business :
- Nom : ${classification.business_name}
- Description : ${classification.business_description}
- Catégories : ${classification.business_category.join(", ")}
- Audience inférée : ${classification.target_audience_inferred.join(" | ")}

Génère 3 personas distincts, ranking par pertinence (le 1er = le plus prometteur).`,
    schema: {
      type: "object",
      properties: {
        audiences: {
          type: "array",
          items: {
            type: "object",
            properties: {
              persona_name: { type: "string" },
              description: { type: "string" },
              age_min: { type: "integer" },
              age_max: { type: "integer" },
              genders: { type: "array", items: { type: "string" } },
              countries: { type: "array", items: { type: "string" } },
              interests: { type: "array", items: { type: "string" } },
              estimated_size_label: {
                type: "string",
                enum: ["narrow", "medium", "broad"],
              },
            },
            required: [
              "persona_name",
              "description",
              "age_min",
              "age_max",
              "genders",
              "countries",
              "interests",
              "estimated_size_label",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["audiences"],
      additionalProperties: false,
    },
  });
}

/* ============================================================
 * 4. generate_copy (headlines + descriptions + CTAs)
 * ============================================================ */

export type CopyResult = {
  headlines: string[]; // max 40 chars chacune
  descriptions: string[]; // max 30 chars
  primary_texts: string[]; // max 125 chars (texte principal au-dessus de l'ad)
  ctas: string[];
  /* Disclaimer auto si secteur réglementé. */
  required_disclaimer: string | null;
};

export async function generateCopy(
  classification: BusinessClassification,
  data: ExtractedData,
): Promise<LLMResponse<CopyResult>> {
  return callLLM<CopyResult>({
    system: `Tu es un copywriter publicitaire FR expert. Tu écris des
annonces courtes, percutantes, conformes à la réglementation française
(Loi Évin, ARPP, ANJ, ACPR, Royer).

Règles strictes :
- headlines : EXACTEMENT 5 propositions, max 40 caractères
- descriptions : EXACTEMENT 5, max 30 caractères
- primary_texts : EXACTEMENT 5, max 125 caractères (texte au-dessus de l'ad)
- ctas : EXACTEMENT 5 (parmi : "En savoir plus", "Acheter", "S'inscrire",
  "Réserver", "Télécharger", "Postuler", "Contactez-nous", "Demander un devis")
- Pas de superlatifs interdits ("le meilleur", "le moins cher" sans preuve)
- Si secteur sensible détecté → required_disclaimer rempli :
    alcool : "L'abus d'alcool est dangereux pour la santé."
    paris  : "Jouer comporte des risques. 09 74 75 13 13"
    crédit : "Un crédit vous engage et doit être remboursé."
    immobilier : "Document non contractuel."
    investissement : "Les performances passées ne préjugent pas des futures."
  Sinon required_disclaimer = null.`,
    user: `Business :
- Nom : ${classification.business_name}
- Description : ${classification.business_description}
- Catégories : ${classification.business_category.join(", ")}
- Secteurs sensibles détectés : ${classification.industry_sensitive_categories.join(", ") || "aucun"}
- Headings du site : ${data.all_h1s.slice(0, 5).join(" | ")}

Génère 5 headlines + 5 descriptions + 5 primary_texts + 5 CTAs adaptés.`,
    schema: {
      type: "object",
      properties: {
        headlines: {
          type: "array",
          items: { type: "string", maxLength: 40 },
        },
        descriptions: {
          type: "array",
          items: { type: "string", maxLength: 30 },
        },
        primary_texts: {
          type: "array",
          items: { type: "string", maxLength: 125 },
        },
        ctas: { type: "array", items: { type: "string" } },
        required_disclaimer: { type: ["string", "null"] },
      },
      required: [
        "headlines",
        "descriptions",
        "primary_texts",
        "ctas",
        "required_disclaimer",
      ],
      additionalProperties: false,
    },
  });
}

/* ============================================================
 * Helpers
 * ============================================================ */

function buildContextString(data: ExtractedData): string {
  const parts: string[] = [];
  if (data.site_name) parts.push(`Nom du site : ${data.site_name}`);
  if (data.site_description)
    parts.push(`Description : ${data.site_description}`);
  if (data.organization?.name)
    parts.push(`Organization (Schema.org) : ${data.organization.name}`);
  if (data.organization?.description)
    parts.push(`Organization desc : ${data.organization.description}`);
  if (data.organization?.address)
    parts.push(
      `Adresse : ${Object.entries(data.organization.address)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}`,
    );

  if (data.all_h1s.length > 0)
    parts.push(`H1 : ${data.all_h1s.slice(0, 10).join(" | ")}`);
  if (data.all_h2s.length > 0)
    parts.push(`H2 : ${data.all_h2s.slice(0, 15).join(" | ")}`);

  if (data.products.length > 0) {
    parts.push(
      `Produits :\n${data.products
        .slice(0, 10)
        .map((p) => `- ${p.name}${p.price ? ` (${p.price}${p.currency ?? ""})` : ""}`)
        .join("\n")}`,
    );
  }
  if (data.services.length > 0) {
    parts.push(
      `Services :\n${data.services
        .slice(0, 5)
        .map((s) => `- ${s.name}`)
        .join("\n")}`,
    );
  }

  /* Texte combiné, max 8K chars pour économie tokens. */
  if (data.all_text_excerpt) {
    parts.push(
      `Extrait texte du site :\n${data.all_text_excerpt.slice(0, 8000)}`,
    );
  }

  return parts.join("\n\n");
}
