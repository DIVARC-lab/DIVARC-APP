import "server-only";

/* Helper OpenAI Chat Completions API.
 *
 * Modèle V1 : gpt-4o-mini ($0.150/M input, $0.600/M output) — bon ratio
 * qualité/prix pour summarization + tagging en français.
 *
 * Si OPENAI_API_KEY n'est pas configuré, le helper retourne null
 * silencieusement → le caller peut afficher un placeholder. */

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatOptions = {
  /* Température 0 = déterministe (summarize), 0.7 = créatif (suggestions). */
  temperature?: number;
  /* Cap les tokens de sortie (évite les blow-ups budget). */
  maxTokens?: number;
};

export async function chatCompletion(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 400,
      }),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    return content ?? null;
  } catch {
    return null;
  }
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
