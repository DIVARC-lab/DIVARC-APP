import "server-only";

/* Sprint G.2 — Summarize un thread (post + commentaires) via LLM.
 *
 * Architecture :
 *  1. Fetch post + commentaires (RLS s'applique, RLS posts garde
 *     l'accès aux non-membres bloqué pour les cercles privés).
 *  2. Format en prompt utilisateur (FR, instructions claires).
 *  3. Appelle chatCompletion (gpt-4o-mini, temp 0.2).
 *  4. Retourne un { summary: string; bullets: string[] } structuré.
 *
 * V2 : caching (key = post_id + last comment timestamp) pour éviter
 * de re-LLM à chaque clic.
 */

import { createClient } from "@/lib/supabase/server";
import { chatCompletion } from "@/lib/openai/chat";

export type ThreadSummary = {
  /* Récap court 1-2 phrases. */
  summary: string;
  /* 3-5 bullets clés. */
  bullets: string[];
  /* Si null, message dégradé. */
  error?: string;
};

const SYSTEM_PROMPT = `Tu es un assistant qui résume des conversations en français pour DIVARC, une super-app de communautés.
Ta tâche : résumer un thread (post + commentaires) de façon concise, neutre et utile.
Format de réponse STRICT — réponds uniquement en JSON valide :
{
  "summary": "1-2 phrases qui résument l'idée principale",
  "bullets": ["point clé 1", "point clé 2", "point clé 3"]
}
Règles :
- Maximum 5 bullets, minimum 3.
- Pas de "Le post dit..." — va droit au but.
- Reste neutre, ne prends pas parti.
- Si le thread est trop court ou vide, indique-le dans summary.`;

export async function summarizeThread(postId: string): Promise<ThreadSummary> {
  const supabase = await createClient();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: post } = await (supabase as any)
    .from("posts")
    .select("id, body, author_id, status, deleted_at")
    .eq("id", postId)
    .maybeSingle();

  if (!post || (post as { deleted_at?: string }).deleted_at) {
    return {
      summary: "Post introuvable.",
      bullets: [],
      error: "post_not_found",
    };
  }

  const { data: comments } = await supabase
    .from("post_comments")
    .select("body, author_id, created_at")
    .eq("post_id", postId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(100);

  const commentList = (comments ?? []) as Array<{
    body: string | null;
    author_id: string;
    created_at: string;
  }>;

  /* Compose le prompt user : post original + comments concaténés. */
  const postBody = ((post as { body?: string | null }).body ?? "").trim();
  const lines: string[] = [];
  if (postBody) {
    lines.push(`Post initial:\n${postBody.slice(0, 2000)}`);
  }
  if (commentList.length > 0) {
    lines.push("\nCommentaires:");
    for (const [i, c] of commentList.entries()) {
      const body = (c.body ?? "").trim();
      if (!body) continue;
      lines.push(`${i + 1}. ${body.slice(0, 500)}`);
    }
  } else {
    lines.push("\n(Aucun commentaire pour l'instant.)");
  }

  const userPrompt = lines.join("\n");
  if (userPrompt.trim().length < 20) {
    return {
      summary: "Thread trop court pour être résumé.",
      bullets: [],
      error: "thread_too_short",
    };
  }

  const raw = await chatCompletion(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.2, maxTokens: 500 },
  );

  if (!raw) {
    return {
      summary: "Résumé indisponible (OpenAI non configuré ou erreur API).",
      bullets: [],
      error: "llm_unavailable",
    };
  }

  /* Parse défensif — le modèle est instructed JSON-only mais peut
     glisser du markdown autour. */
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      summary: raw.slice(0, 200),
      bullets: [],
      error: "json_parse_fallback",
    };
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      summary?: unknown;
      bullets?: unknown;
    };
    const summary =
      typeof parsed.summary === "string" ? parsed.summary : "Résumé vide.";
    const bullets = Array.isArray(parsed.bullets)
      ? parsed.bullets
          .filter((b): b is string => typeof b === "string")
          .slice(0, 5)
      : [];
    return { summary, bullets };
  } catch {
    return {
      summary: raw.slice(0, 200),
      bullets: [],
      error: "json_invalid",
    };
  }
}
