"use client";

import { Award, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { submitQuiz } from "../actions";

type SafeQuestion = {
  id: string;
  position_order: number;
  prompt: string;
  options: string[];
};

type Props = {
  quizId: string;
  questions: SafeQuestion[];
};

type Result = {
  score: number;
  total: number;
  passed: boolean;
  feedback: Array<{
    position: number;
    correct: boolean;
    correct_index: number;
    explanation: string | null;
  }>;
};

export function QuizPlayer({ quizId, questions }: Props) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function pick(position: number, idx: number) {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [position]: idx }));
  }

  function submit() {
    const ordered = questions.map((q) => answers[q.position_order] ?? -1);
    if (ordered.some((a) => a === -1)) {
      alert("Réponds à toutes les questions avant de soumettre.");
      return;
    }
    startTransition(async () => {
      const r = await submitQuiz({ quiz_id: quizId, answers: ordered });
      if (!r.ok) {
        alert(r.error);
        return;
      }
      setResult({
        score: r.score,
        total: r.total,
        passed: r.passed,
        feedback: r.feedback,
      });
    });
  }

  function reset() {
    setAnswers({});
    setResult(null);
  }

  if (result) {
    return (
      <div className="space-y-6">
        <article
          className={cn(
            "rounded-3xl p-8 border-2 text-center",
            result.passed
              ? "bg-gradient-to-br from-emerald-50 to-cream border-emerald-300"
              : "bg-gradient-to-br from-red-50 to-cream border-red-300",
          )}
        >
          {result.passed ? (
            <Award className="w-16 h-16 mx-auto text-gold-deep" aria-hidden />
          ) : (
            <XCircle className="w-16 h-16 mx-auto text-red-600" aria-hidden />
          )}
          <h2 className="mt-4 font-display text-3xl text-night">
            {result.passed
              ? "Bravo, badge débloqué ✨"
              : "Pas tout à fait."}
          </h2>
          <p className="mt-2 text-night-muted">
            Score : <strong className="text-night">{result.score}%</strong>
          </p>
        </article>

        <ul className="space-y-3">
          {questions.map((q, i) => {
            const fb = result.feedback.find((f) => f.position === q.position_order);
            const userAnswer = answers[q.position_order];
            return (
              <li
                key={q.id}
                className={cn(
                  "p-4 rounded-2xl border bg-white",
                  fb?.correct
                    ? "border-emerald-200"
                    : "border-red-200",
                )}
              >
                <p className="text-sm font-semibold text-night mb-2">
                  {i + 1}. {q.prompt}
                </p>
                <ul className="space-y-1.5 text-sm">
                  {q.options.map((opt, idx) => {
                    const isCorrect = idx === fb?.correct_index;
                    const isUserPick = idx === userAnswer;
                    return (
                      <li
                        key={idx}
                        className={cn(
                          "px-3 py-1.5 rounded-xl",
                          isCorrect
                            ? "bg-emerald-50 text-emerald-700 font-semibold"
                            : isUserPick
                              ? "bg-red-50 text-red-600"
                              : "text-night-muted",
                        )}
                      >
                        {isCorrect ? "✓ " : isUserPick ? "✗ " : "· "}
                        {opt}
                      </li>
                    );
                  })}
                </ul>
                {fb?.explanation ? (
                  <p className="mt-3 text-xs text-muted italic leading-relaxed">
                    {fb.explanation}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="flex justify-center gap-3">
          <Button variant="ghost" onClick={reset}>
            <RotateCcw className="w-4 h-4" aria-hidden />
            Refaire
          </Button>
          <Button asChild>
            <Link href="/skills">Retour aux quizzes</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {questions.map((q, i) => {
        const picked = answers[q.position_order];
        return (
          <article
            key={q.id}
            className="p-5 rounded-2xl bg-white border border-line"
          >
            <p className="font-semibold text-night mb-3">
              {i + 1}. {q.prompt}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => pick(q.position_order, idx)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors",
                    picked === idx
                      ? "bg-night text-cream border-night"
                      : "bg-white text-night border-line hover:border-night/40",
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </article>
        );
      })}

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-line">
        <p className="text-xs text-muted">
          {Object.keys(answers).length} / {questions.length} répondues
        </p>
        <Button
          onClick={submit}
          loading={pending}
          disabled={Object.keys(answers).length !== questions.length}
          size="lg"
        >
          <CheckCircle2 className="w-4 h-4" aria-hidden />
          Soumettre
        </Button>
      </div>
    </div>
  );
}
