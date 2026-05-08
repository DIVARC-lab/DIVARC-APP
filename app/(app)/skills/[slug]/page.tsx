import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getQuizBySlug } from "@/lib/queries/skills";
import { createClient } from "@/lib/supabase/server";
import { QuizPlayer } from "../_components/QuizPlayer";
import { KickerLabel } from "@/components/ui/KickerLabel";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getQuizBySlug(slug);
  if (!data) return { title: "Quiz introuvable" };
  return { title: data.quiz.title };
}

export default async function QuizPage({ params }: { params: Params }) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = await getQuizBySlug(slug);
  if (!data) notFound();

  // Sanitize : on enlève correct_index pour le client.
  const safeQuestions = data.questions.map((q) => ({
    id: q.id,
    position_order: q.position_order,
    prompt: q.prompt,
    options: q.options,
  }));

  return (
    <div className="px-6 sm:px-10 py-10 max-w-2xl mx-auto w-full space-y-8">
      <Link
        href="/skills"
        className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Quizzes
      </Link>

      <header>
        <KickerLabel>{data.quiz.skill_name}</KickerLabel>
        <h1 className="mt-2 font-display text-4xl text-night">
          {data.quiz.title}
        </h1>
        {data.quiz.description ? (
          <p className="mt-2 text-muted-strong">{data.quiz.description}</p>
        ) : null}
        <p className="mt-2 text-xs text-muted">
          {data.questions.length} questions · seuil de réussite{" "}
          {data.quiz.pass_score}%
        </p>
      </header>

      <QuizPlayer quizId={data.quiz.id} questions={safeQuestions} />
    </div>
  );
}
