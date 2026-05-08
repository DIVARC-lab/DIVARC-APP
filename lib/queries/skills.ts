import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  SkillQuiz,
  SkillQuizAttempt,
  SkillQuizQuestion,
  UserSkillBadge,
} from "@/lib/database.types";

export async function listQuizzes(): Promise<SkillQuiz[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("skill_quizzes")
    .select("*")
    .order("title", { ascending: true });
  return data ?? [];
}

export async function getQuizBySlug(
  slug: string,
): Promise<{ quiz: SkillQuiz; questions: SkillQuizQuestion[] } | null> {
  const supabase = await createClient();
  const { data: quiz } = await supabase
    .from("skill_quizzes")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!quiz) return null;

  const { data: questions } = await supabase
    .from("skill_quiz_questions")
    .select("*")
    .eq("quiz_id", quiz.id)
    .order("position_order", { ascending: true });

  // On masque correct_index côté serveur — on ne le renvoie pas au client.
  const sanitized = (questions ?? []).map((q) => ({
    ...q,
    options: Array.isArray(q.options)
      ? (q.options as string[])
      : ((q.options as unknown as string[]) ?? []),
  }));
  return { quiz, questions: sanitized };
}

export async function getMyBadges(
  userId: string,
): Promise<UserSkillBadge[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_skill_badges")
    .select("*")
    .eq("user_id", userId)
    .order("last_attempt_at", { ascending: false });
  return (data ?? []) as UserSkillBadge[];
}

export async function getMyAttemptsForQuiz(
  userId: string,
  quizId: string,
): Promise<SkillQuizAttempt[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("skill_quiz_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("quiz_id", quizId)
    .order("finished_at", { ascending: false });
  return data ?? [];
}
