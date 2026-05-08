import { Award, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getMyBadges, listQuizzes } from "@/lib/queries/skills";
import { createClient } from "@/lib/supabase/server";
import { KickerLabel } from "@/components/ui/KickerLabel";

export const metadata = {
  title: "Compétences vérifiées",
};

export default async function SkillsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [quizzes, badges] = await Promise.all([
    listQuizzes(),
    getMyBadges(user.id),
  ]);

  const passedSet = new Set(badges.filter((b) => b.passed).map((b) => b.quiz_id));
  const bestByQuiz = new Map(
    badges.map((b) => [b.quiz_id, { score: b.best_score, passed: b.passed }]),
  );

  return (
    <div className="px-6 sm:px-10 py-10 max-w-5xl mx-auto w-full space-y-8">
      <header>
        <KickerLabel>Compétences vérifiées</KickerLabel>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
          Prouve ton <em className="italic text-gold-deep">niveau</em>.
        </h1>
        <p className="mt-2 text-muted-strong max-w-xl">
          Quiz courts (5 min) qui valident tes compétences. Les recruteurs
          voient le badge directement sur ton profil.
        </p>
      </header>

      {badges.length > 0 ? (
        <section className="rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/10 border-2 border-gold/30 p-6">
          <h2 className="font-display text-xl text-night mb-4">
            Tes badges
          </h2>
          <ul className="flex flex-wrap gap-2">
            {badges
              .filter((b) => b.passed)
              .map((b) => (
                <li
                  key={b.quiz_id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gold/40 text-sm font-semibold text-night"
                >
                  <Award className="w-4 h-4 text-gold-deep" aria-hidden />
                  <span>{b.skill_name}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gold-deep">
                    {b.best_score}%
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="font-display text-2xl text-night mb-4">
          Quiz disponibles
        </h2>
        {quizzes.length === 0 ? (
          <p className="text-sm text-muted">Aucun quiz pour l&apos;instant.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-4">
            {quizzes.map((q) => {
              const best = bestByQuiz.get(q.id);
              const passed = passedSet.has(q.id);
              return (
                <li key={q.id}>
                  <article className="p-5 rounded-3xl bg-white border border-line hover:border-night/30 transition-colors flex flex-col gap-3 h-full">
                    <header>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-night/5 text-[10px] font-bold uppercase tracking-widest text-night-muted">
                        {q.skill_name}
                      </span>
                      <h3 className="mt-2 font-display text-xl text-night">
                        {q.title}
                      </h3>
                      {q.description ? (
                        <p className="mt-1 text-sm text-night-muted line-clamp-2">
                          {q.description}
                        </p>
                      ) : null}
                    </header>
                    <p className="text-xs text-muted">
                      {q.question_count} questions · {q.duration_min} min ·
                      seuil {q.pass_score}%
                    </p>
                    <footer className="mt-auto flex items-center justify-between gap-2">
                      {best ? (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            passed ? "text-emerald-700" : "text-night-muted"
                          }`}
                        >
                          {passed ? (
                            <Award className="w-3.5 h-3.5" aria-hidden />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" aria-hidden />
                          )}
                          Meilleur score : {best.score}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted">Jamais tenté</span>
                      )}
                      <Button asChild size="sm">
                        <Link href={`/skills/${q.slug}`}>
                          {passed ? "Refaire" : "Commencer"}
                        </Link>
                      </Button>
                    </footer>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
