"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const submitSchema = z.object({
  quiz_id: z.string().uuid(),
  answers: z.array(z.number().int().min(0)),
});

export type SubmitResult =
  | {
      ok: true;
      score: number;
      total: number;
      passed: boolean;
      feedback: Array<{
        position: number;
        correct: boolean;
        correct_index: number;
        explanation: string | null;
      }>;
    }
  | { ok: false; error: string };

export async function submitQuiz(args: {
  quiz_id: string;
  answers: number[];
}): Promise<SubmitResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const parsed = submitSchema.safeParse(args);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const { data: quiz } = await supabase
    .from("skill_quizzes")
    .select("id, pass_score, question_count")
    .eq("id", parsed.data.quiz_id)
    .maybeSingle();
  if (!quiz) return { ok: false, error: "Quiz introuvable." };

  const { data: questions } = await supabase
    .from("skill_quiz_questions")
    .select("id, position_order, correct_index, explanation")
    .eq("quiz_id", quiz.id)
    .order("position_order", { ascending: true });
  if (!questions || questions.length === 0) {
    return { ok: false, error: "Quiz vide." };
  }

  const total = questions.length;
  let score = 0;
  const feedback: Array<{
    position: number;
    correct: boolean;
    correct_index: number;
    explanation: string | null;
  }> = [];

  for (let i = 0; i < total; i++) {
    const q = questions[i]!;
    const userAnswer = parsed.data.answers[i] ?? -1;
    const correct = userAnswer === q.correct_index;
    if (correct) score += 1;
    feedback.push({
      position: q.position_order,
      correct,
      correct_index: q.correct_index,
      explanation: q.explanation,
    });
  }

  const percent = Math.round((score / total) * 100);
  const passed = percent >= quiz.pass_score;

  const { error } = await supabase.from("skill_quiz_attempts").insert({
    user_id: user.id,
    quiz_id: quiz.id,
    score: percent,
    total,
    passed,
    answers: parsed.data.answers,
  });
  if (error) return { ok: false, error: "Enregistrement impossible." };

  revalidatePath("/skills");
  return { ok: true, score: percent, total, passed, feedback };
}
