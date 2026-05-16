/* Étape 19 — Modération chat via Claude Haiku 4.5.
 *
 * Appel direct à l'API Anthropic (pas de SDK pour éviter une dépendance).
 * Modèle : claude-haiku-4-5-20251001 (fast, low cost).
 *
 * Stratégie : on demande à Claude une réponse JSON stricte avec un
 * verdict allow/flag et catégories. Timeout court (1500ms) pour ne pas
 * bloquer le chat indéfiniment — en cas de timeout, on laisse passer
 * (fail-open) avec un log côté serveur. */

type ModerationVerdict = {
  allowed: boolean;
  categories: string[];
  reason: string | null;
  score: number;
};

const MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 1500;

const SYSTEM_PROMPT = `Tu es un modérateur de chat live (équivalent Twitch/YouTube/TikTok).
Ta tâche : décider si un court message texte FR doit être bloqué.

Bloque uniquement si le message contient :
- Insultes graves directes (à un user nommé ou général)
- Discours haineux (racisme, homophobie, xénophobie, antisémitisme)
- Menaces explicites de violence
- Spam évident (liens promo, vente, "DM moi", crypto pump)
- Harcèlement sexuel / propos sexuels non-consentis
- Contenu illégal ou prônant un acte illégal
- Doxxing (adresse IP, téléphone, adresse perso d'autrui)
- Auto-promo agressive (cumul de chaînes externes)

Laisse passer :
- Critique constructive, désaccord poli
- Argot, sarcasme bienveillant, emojis
- Compliments, exclamations, fan-talk
- Questions au streamer
- Inside-jokes communauté
- Fautes d'orthographe / sms-speak

Tu dois répondre UNIQUEMENT par un JSON valide, rien d'autre :
{"allowed": true|false, "categories": ["array_of_strings"], "reason": "courte raison FR si bloqué sinon null", "score": 0.0 à 1.0 (confiance dans le blocage)}

Catégories possibles : insult, hate, threat, spam, harassment, sexual, illegal, doxxing, self_promo.`;

export async function moderateChatMessage(
  content: string,
): Promise<ModerationVerdict | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    /* Pas configuré → on laisse passer (fail-open). */
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Message à modérer : """${content.slice(0, 500)}"""`,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(
        "[moderateChatMessage] API error",
        res.status,
        await res.text().catch(() => ""),
      );
      return null;
    }

    const payload = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = payload.content?.find((b) => b.type === "text")?.text ?? "";
    if (!text) return null;

    /* Extraction du JSON. Claude peut entourer la réponse, on cherche
       le premier { au dernier }. */
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return null;

    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<
        ModerationVerdict
      >;
      return {
        allowed: parsed.allowed !== false,
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        reason:
          typeof parsed.reason === "string" ? parsed.reason : null,
        score:
          typeof parsed.score === "number"
            ? Math.max(0, Math.min(1, parsed.score))
            : 0,
      };
    } catch {
      return null;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      console.warn("[moderateChatMessage] timeout — fail-open");
    } else {
      console.error("[moderateChatMessage] error", err);
    }
    return null;
  }
}
