import "server-only";

/* Helper OpenAI Embeddings API.
 *
 * Modèle : text-embedding-3-small (1536 dims, $0.02/M tokens, optimal
 * pour FR + EN). Si OPENAI_API_KEY n'est pas configuré, le helper
 * retourne null silencieusement → le caller peut gracefully skip
 * l'indexation et recommandation reste fonctionnelle sur heuristique.
 *
 * Best practices :
 *  - Limite source à ~8000 chars (limite token OpenAI 8191 pour ada/3-small)
 *  - Strip URLs, mentions @, hashtags ne sont pas strippés (gardent du sens)
 *  - Retry simple (1 tentative supplémentaire en cas d'erreur 429/500)
 */

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_INPUT_CHARS = 8000;

export type EmbeddingResult = {
  embedding: number[];
  model: string;
  source_text: string;
};

/* Génère un embedding pour un texte. Retourne null si :
 *  - OPENAI_API_KEY absent (no-op silencieux, on skip indexation)
 *  - Texte vide ou trop court (<10 chars)
 *  - Erreur réseau / API
 */
export async function generateEmbedding(
  text: string,
): Promise<EmbeddingResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const cleaned = cleanTextForEmbedding(text);
  if (cleaned.length < 10) return null;

  try {
    const response = await fetchWithRetry(OPENAI_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: cleaned,
      }),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    const embedding = data.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== 1536) return null;

    return {
      embedding,
      model: EMBEDDING_MODEL,
      source_text: cleaned,
    };
  } catch {
    return null;
  }
}

/* Strip les éléments inutiles pour l'embedding sémantique :
 *  - URLs (parasitent l'espace tokens sans apporter de sens dense)
 *  - Doubles whitespaces
 *  - Tronque à MAX_INPUT_CHARS
 *
 * On GARDE :
 *  - Les hashtags (#tech, #cooking) → ils sont denses sémantiquement
 *  - Les mentions @user (contexte social)
 *  - Les emoji (signal émotionnel) */
function cleanTextForEmbedding(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_INPUT_CHARS);
}

/* Retry simple : 1 tentative supplémentaire si 429 ou 5xx. Pas de
 * backoff exponentiel pour V1 — si l'API OpenAI est en panne, on perd
 * l'indexation de ce post et le cron de backfill rattrapera. */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const r1 = await fetch(url, init);
  if (r1.ok || (r1.status !== 429 && r1.status < 500)) return r1;
  await new Promise((resolve) => setTimeout(resolve, 800));
  return fetch(url, init);
}
