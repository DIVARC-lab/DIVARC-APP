"use server";

/* Server Actions AI Assistant cercle (V1 sans LLM externe).
 *
 * Stratégie V1 : recherche FTS Postgres sur rules + library + posts
 * du cercle. On retourne les meilleurs snippets et on demande au
 * client de synthétiser une réponse textuelle simple (ou on affiche
 * les sources telles quelles avec un wrapper "Voici ce que j'ai
 * trouvé").
 *
 * V2 (futur) : intégrer un LLM via Edge Function Anthropic/OpenAI
 * pour générer une vraie réponse naturelle à partir des sources. */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { CircleAISource } from "@/lib/database.types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

const askSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  question: z.string().min(3).max(1000),
});

export async function askCircleAI(args: z.infer<typeof askSchema>): Promise<
  | { ok: true; id: string; answer: string; sources: CircleAISource[]; confidence: number }
  | { ok: false; error: string }
> {
  const parsed = askSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié" };

  /* Search FTS via RPC. */
  const { data: matches, error: searchError } = await (supabase as SupabaseAny).rpc(
    "search_circle_knowledge",
    {
      p_circle_id: parsed.data.circleId,
      p_query: parsed.data.question,
      p_limit: 5,
    },
  );
  if (searchError) {
    return { ok: false, error: searchError.message };
  }

  const sources: CircleAISource[] = ((matches ?? []) as Array<{
    source_type: string;
    source_id: string;
    title: string;
    snippet: string;
    rank: number;
  }>).map((m) => ({
    type: m.source_type as CircleAISource["type"],
    id: m.source_id,
    title: m.title,
    snippet: m.snippet,
    rank: m.rank,
  }));

  /* Score de confiance basé sur le rank max (heuristique simple). */
  const maxRank = sources[0]?.rank ?? 0;
  const confidence = Math.min(100, Math.round(maxRank * 100));

  /* Synthèse V1 = template basé sur les sources. */
  let answer: string;
  if (sources.length === 0) {
    answer =
      "Je n'ai trouvé aucune information sur ce sujet dans le contenu du cercle (règles, bibliothèque, posts). Essaye de reformuler ou pose ta question directement aux membres dans le chat.";
  } else {
    const ruleMatches = sources.filter((s) => s.type === "rule");
    const libMatches = sources.filter((s) => s.type === "library");
    const postMatches = sources.filter((s) => s.type === "post");
    const parts: string[] = [];
    if (ruleMatches.length > 0) {
      parts.push(
        `📋 Selon les règles du cercle : « ${ruleMatches[0].title} ». ${ruleMatches[0].snippet}`,
      );
    }
    if (libMatches.length > 0) {
      parts.push(
        `📚 Dans la bibliothèque : « ${libMatches[0].title} » — ${libMatches[0].snippet.slice(0, 200)}…`,
      );
    }
    if (postMatches.length > 0) {
      parts.push(
        `💬 Un post pertinent : « ${postMatches[0].snippet.slice(0, 200)}… »`,
      );
    }
    answer =
      parts.join("\n\n") +
      `\n\nPour plus d'infos, consulte les sources ci-dessous ou pose ta question dans le chat.`;
  }

  /* Persist en DB pour cache + analytics futurs. */
  const { data, error: insertError } = await (supabase as SupabaseAny)
    .from("circle_ai_qa")
    .insert({
      circle_id: parsed.data.circleId,
      user_id: user.id,
      question: parsed.data.question,
      answer,
      sources,
      confidence,
    })
    .select("id")
    .single();

  if (insertError || !data) {
    return { ok: false, error: insertError?.message ?? "Insert failed" };
  }
  revalidatePath(`/circles/${parsed.data.circleSlug}/ai`);
  return { ok: true, id: data.id as string, answer, sources, confidence };
}

const feedbackSchema = z.object({
  qaId: z.string().uuid(),
  circleSlug: z.string().min(1),
  feedback: z.enum(["useful", "not_useful"]),
});

export async function setCircleAIFeedback(args: z.infer<typeof feedbackSchema>) {
  const parsed = feedbackSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const supabase = await createClient();
  const { error } = await (supabase as SupabaseAny)
    .from("circle_ai_qa")
    .update({ user_feedback: parsed.data.feedback })
    .eq("id", parsed.data.qaId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/circles/${parsed.data.circleSlug}/ai`);
  return { ok: true as const };
}
