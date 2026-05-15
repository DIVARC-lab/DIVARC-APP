"use client";

/* CircleAIAssistantView — Bot Q&A FAQ du cercle.
 *
 * V1 : recherche FTS Postgres sur rules + library + posts du cercle.
 * Synthèse template (pas de LLM). L'user peut donner un feedback
 * useful / not_useful pour entraîner la V2.
 *
 * UX :
 *  - Header + zone "Pose ta question"
 *  - Composer textarea + bouton Envoyer
 *  - Conversation Q&A historique (du plus récent au plus ancien)
 *  - Sources cliquables sous chaque réponse */

import {
  BookOpen,
  FileText,
  MessageSquare,
  Send,
  Shield,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { CircleAISource } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { askCircleAI, setCircleAIFeedback } from "../ai-actions";

type Props = {
  circleId: string;
  circleSlug: string;
};

type QAItem = {
  id: string;
  question: string;
  answer: string;
  sources: CircleAISource[];
  confidence: number;
  feedback: "useful" | "not_useful" | null;
};

export function CircleAIAssistantView({ circleId, circleSlug }: Props) {
  const [history, setHistory] = useState<QAItem[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, startTransition] = useTransition();

  function ask() {
    const q = question.trim();
    if (q.length < 3) {
      toast.error("La question doit faire au moins 3 caractères");
      return;
    }
    startTransition(async () => {
      const res = await askCircleAI({
        circleId,
        circleSlug,
        question: q,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setHistory((prev) => [
        {
          id: res.id,
          question: q,
          answer: res.answer,
          sources: res.sources,
          confidence: res.confidence,
          feedback: null,
        },
        ...prev,
      ]);
      setQuestion("");
    });
  }

  async function feedback(qaId: string, value: "useful" | "not_useful") {
    /* Optimistic. */
    setHistory((prev) =>
      prev.map((q) => (q.id === qaId ? { ...q, feedback: value } : q)),
    );
    const res = await setCircleAIFeedback({
      qaId,
      circleSlug,
      feedback: value,
    });
    if (!res.ok) {
      toast.error(res.error);
      /* Rollback. */
      setHistory((prev) =>
        prev.map((q) => (q.id === qaId ? { ...q, feedback: null } : q)),
      );
    }
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header>
        <h1 className="font-display italic text-2xl sm:text-3xl text-night flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-gold-deep" aria-hidden />
          Assistant IA
        </h1>
        <p className="text-[12.5px] text-night-muted mt-1">
          Pose une question sur le cercle. Je cherche dans les règles,
          la bibliothèque et les posts pour te répondre.
        </p>
      </header>

      {/* Composer */}
      <div className="bg-gradient-to-br from-gold/5 via-white to-white border border-gold/30 rounded-3xl p-4 shadow-soft">
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-night-muted mb-2">
            Ta question
          </span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ex: Comment fonctionne la modération ? Y a-t-il des règles sur le spam ?"
            rows={2}
            maxLength={1000}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                ask();
              }
            }}
            className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px] resize-y focus:outline-none focus:ring-2 focus:ring-gold/30"
          />
        </label>
        <div className="flex items-center justify-between mt-3">
          <p className="text-[11px] text-night-muted">
            Cmd/Ctrl+Entrée pour envoyer
          </p>
          <button
            type="button"
            onClick={ask}
            disabled={pending || question.trim().length < 3}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-gold text-night text-[12px] font-bold disabled:opacity-50 hover:bg-gold-soft"
          >
            <Send className="w-3.5 h-3.5" aria-hidden />
            {pending ? "Recherche…" : "Demander"}
          </button>
        </div>
      </div>

      {/* History */}
      {history.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="w-12 h-12 text-night-muted/30 mx-auto mb-3" aria-hidden />
          <p className="text-[13px] text-night-muted">
            Aucune question pour l&apos;instant.
          </p>
          <p className="text-[12px] text-night-muted/70 mt-1">
            Essaie : « Quelles sont les règles ? » ou « Comment poster un job ? »
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((qa) => (
            <QAItemCard
              key={qa.id}
              qa={qa}
              circleSlug={circleSlug}
              onFeedback={(value) => feedback(qa.id, value)}
            />
          ))}
        </div>
      )}

      {/* Info beta */}
      <div className="bg-night/[0.03] rounded-2xl p-4 border border-line text-[11px] text-night-muted leading-relaxed">
        <p className="font-bold text-night mb-1">🧠 V1 — Beta</p>
        <p>
          L&apos;assistant utilise une recherche full-text dans le contenu
          du cercle (gratuit, instantané). Une version V2 avec un LLM
          (réponses naturelles) arrivera prochainement pour les cercles
          Premium.
        </p>
      </div>
    </div>
  );
}

function QAItemCard({
  qa,
  circleSlug,
  onFeedback,
}: {
  qa: QAItem;
  circleSlug: string;
  onFeedback: (value: "useful" | "not_useful") => void;
}) {
  return (
    <div className="bg-white border border-line rounded-2xl p-4">
      {/* Question */}
      <div className="mb-3 pb-3 border-b border-line">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-night-muted mb-1">
          Question
        </p>
        <p className="text-[14px] text-night font-semibold">{qa.question}</p>
      </div>

      {/* Réponse */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-night-muted">
            Réponse
          </p>
          <span
            className={cn(
              "inline-flex items-center px-1.5 h-4 rounded-full text-[9px] font-bold uppercase tracking-[0.08em]",
              qa.confidence >= 60
                ? "bg-emerald-500/10 text-emerald-700"
                : qa.confidence >= 30
                  ? "bg-gold/15 text-gold-deep"
                  : "bg-rose-500/10 text-rose-700",
            )}
          >
            {qa.confidence}% conf.
          </span>
        </div>
        <p className="text-[14px] text-night leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {qa.answer}
        </p>
      </div>

      {/* Sources */}
      {qa.sources.length > 0 ? (
        <div className="mb-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-night-muted mb-2">
            Sources
          </p>
          <div className="space-y-1.5">
            {qa.sources.map((s) => (
              <SourceCard key={`${s.type}-${s.id}`} source={s} circleSlug={circleSlug} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Feedback */}
      <div className="flex items-center gap-2 pt-3 border-t border-line">
        <span className="text-[11px] text-night-muted">Cette réponse t&apos;a aidé ?</span>
        <button
          type="button"
          onClick={() => onFeedback("useful")}
          aria-label="Utile"
          disabled={qa.feedback !== null}
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
            qa.feedback === "useful"
              ? "bg-emerald-500 text-white"
              : "bg-night/5 hover:bg-night/10 text-night-muted",
            qa.feedback !== null && qa.feedback !== "useful" && "opacity-30",
          )}
        >
          <ThumbsUp className="w-3.5 h-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onFeedback("not_useful")}
          aria-label="Pas utile"
          disabled={qa.feedback !== null}
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
            qa.feedback === "not_useful"
              ? "bg-rose-500 text-white"
              : "bg-night/5 hover:bg-night/10 text-night-muted",
            qa.feedback !== null && qa.feedback !== "not_useful" && "opacity-30",
          )}
        >
          <ThumbsDown className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function SourceCard({
  source,
  circleSlug,
}: {
  source: CircleAISource;
  circleSlug: string;
}) {
  const Icon = source.type === "rule" ? Shield : source.type === "library" ? BookOpen : MessageSquare;
  const label = source.type === "rule" ? "Règle" : source.type === "library" ? "Bibliothèque" : "Post";
  const href =
    source.type === "rule"
      ? `/circles/${circleSlug}/about#rule-${source.id}`
      : source.type === "library"
        ? `/circles/${circleSlug}/library#item-${source.id}`
        : `/feed/${source.id}`;

  return (
    <Link
      href={href}
      className="block p-2.5 rounded-xl bg-night/[0.03] hover:bg-night/[0.06] transition-colors"
    >
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-lg bg-white border border-line flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-night-muted" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-night-muted">
              {label}
            </span>
            <FileText className="w-2.5 h-2.5 text-night-muted/50" aria-hidden />
          </div>
          <p className="text-[12px] font-semibold text-night truncate">
            {source.title || "Sans titre"}
          </p>
          <p className="text-[11px] text-night-muted line-clamp-1">
            {source.snippet}
          </p>
        </div>
      </div>
    </Link>
  );
}
