"use client";

/* Sprint G.2 — Bouton "🪄 Résumer ce thread" — appelle l'API
 * /api/circles/posts/[postId]/summarize et affiche le résumé inline. */

import { Loader2, Sparkles, X } from "lucide-react";
import { useState } from "react";

type Props = {
  postId: string;
  /* On n'affiche le bouton que si commentsCount >= threshold (default 5). */
  commentsCount: number;
  threshold?: number;
};

type SummaryState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; summary: string; bullets: string[] }
  | { kind: "error"; message: string };

export function SummarizeThreadButton({
  postId,
  commentsCount,
  threshold = 5,
}: Props) {
  const [state, setState] = useState<SummaryState>({ kind: "idle" });

  if (commentsCount < threshold) return null;

  async function handleClick() {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/circles/posts/${postId}/summarize`, {
        method: "GET",
      });
      if (!res.ok) {
        setState({ kind: "error", message: "Résumé indisponible." });
        return;
      }
      const data = (await res.json()) as {
        summary: string;
        bullets: string[];
        error?: string;
      };
      if (data.error) {
        setState({
          kind: "error",
          message:
            data.error === "llm_unavailable"
              ? "L'assistant IA n'est pas configuré sur ce serveur."
              : "Résumé indisponible.",
        });
        return;
      }
      setState({
        kind: "ok",
        summary: data.summary,
        bullets: data.bullets,
      });
    } catch {
      setState({ kind: "error", message: "Erreur réseau." });
    }
  }

  if (state.kind === "idle" || state.kind === "loading") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={state.kind === "loading"}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-gold/10 border border-gold/30 text-[11px] font-bold text-gold-deep hover:bg-gold/20 transition-colors disabled:opacity-60"
      >
        {state.kind === "loading" ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Résumé en cours…
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3" />
            Résumer ce thread ({commentsCount} commentaires)
          </>
        )}
      </button>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-[11.5px] text-rose-700">
        ⚠️ {state.message}
        <button
          type="button"
          onClick={() => setState({ kind: "idle" })}
          className="ml-1"
          aria-label="Fermer"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-2xl bg-gradient-to-br from-gold/5 to-cream-deep border border-gold/20 p-3 text-[12px] text-night leading-relaxed">
      <div className="flex items-start gap-2">
        <Sparkles
          className="w-3.5 h-3.5 mt-0.5 text-gold-deep shrink-0"
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold mb-1">{state.summary}</p>
          {state.bullets.length > 0 ? (
            <ul className="space-y-0.5 list-disc list-inside text-night-dim">
              {state.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setState({ kind: "idle" })}
          className="shrink-0 text-night-dim hover:text-night"
          aria-label="Fermer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
