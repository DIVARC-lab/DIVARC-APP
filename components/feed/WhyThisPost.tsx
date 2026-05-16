"use client";

import {
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { Info, Loader2, Settings, ThumbsDown, UserX } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/tracking/eventTracker";

/* WhyThisPost — popover transparence DSA / UX Facebook-like.
 *
 * Click sur l'icône Info en haut-droite d'un post → popover qui explique
 * pourquoi le post est apparu dans le feed + 3 actions de feedback :
 *  - Voir moins de ce type (post.see_less)
 *  - Ne plus voir cet auteur (user.hide → ajoute à hidden_users)
 *  - Lien vers /settings/algorithm (désactiver complètement)
 *
 * Les `signals` viennent du `ranking_metadata.primary_signals` du feed
 * personnalisé. Si absent (post legacy sans rank metadata), on affiche
 * un message générique.
 *
 * Position : ancré au bouton via @floating-ui/react avec flip + shift. */

export type RankingSignalDisplay = {
  type: string;
  label: string;
  weight: number;
};

type WhyThisPostProps = {
  postId: string;
  authorId?: string;
  signals?: RankingSignalDisplay[];
};

export function WhyThisPost({ postId, authorId, signals = [] }: WhyThisPostProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* Sprint Recsys Étape 19 — Si signals n'est pas fourni par le parent
     (cas hors feed personnalisé : circles, profile, etc.), on fetch
     /api/feed/posts/[postId]/explain au moment de l'ouverture du popover.
     L'API appelle la RPC explain_post_ranking et renvoie 6 raisons FR. */
  const [fetchedSignals, setFetchedSignals] = useState<RankingSignalDisplay[] | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (signals.length > 0) return; // déjà fournis par le parent
    if (fetchedSignals !== null) return; // déjà fetched

    let alive = true;
    setFetching(true);
    (async () => {
      try {
        const res = await fetch(`/api/feed/posts/${postId}/explain`);
        if (!res.ok) {
          if (alive) setFetchedSignals([]);
          return;
        }
        const data = (await res.json()) as {
          reasons?: Array<{
            kind: string;
            weight: number;
            text: string;
          }>;
        };
        if (alive) {
          setFetchedSignals(
            (data.reasons ?? []).map((r) => ({
              type: r.kind,
              label: r.text,
              weight: r.weight,
            })),
          );
        }
      } catch {
        if (alive) setFetchedSignals([]);
      } finally {
        if (alive) setFetching(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, postId, signals.length, fetchedSignals]);

  const displaySignals: RankingSignalDisplay[] =
    signals.length > 0 ? signals : (fetchedSignals ?? []);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom-end",
    middleware: [offset(8), flip({ padding: 12 }), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context, { outsidePress: true });
  const role = useRole(context, { role: "menu" });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  async function sendFeedback(reason: "see_less" | "hide_author") {
    setSubmitting(true);
    try {
      const body = {
        reason,
        post_id: postId,
        author_id: reason === "hide_author" ? authorId : undefined,
      };
      const response = await fetch("/api/feedback/negative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        toast.error("Action impossible. Réessaie.");
        return;
      }
      /* Track local pour cohérence avec EVENT_WEIGHTS — l'endpoint
         backend a déjà inséré l'event recsys_events, mais on rajoute
         un marker local pour l'historique session. */
      trackEvent(`post.${reason}`, {
        target_post_id: postId,
        target_user_id: authorId,
      });
      toast.success(
        reason === "see_less"
          ? "Tu verras moins ce type de contenu."
          : "Cet auteur ne sera plus dans ton feed.",
      );
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        {...getReferenceProps()}
        aria-label="Pourquoi je vois ce contenu ?"
        className="w-8 h-8 rounded-full hover:bg-night/5 flex items-center justify-center text-night-dim hover:text-night transition-colors"
      >
        <Info className="w-3.5 h-3.5" aria-hidden />
      </button>
      {open ? (
        <div
          ref={refs.setFloating}
          {...getFloatingProps()}
          style={floatingStyles}
          className="z-50 w-80 rounded-2xl bg-surface border border-line shadow-[0_24px_60px_-20px_rgba(10,31,68,0.45)] overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150"
        >
          <header className="px-4 pt-4 pb-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
              · Pourquoi je vois ce contenu
            </p>
            <h3 className="mt-1 font-display italic text-lg text-night leading-tight">
              Les signaux qui ont compté
            </h3>
          </header>
          <ul className="px-4 pb-3 space-y-1.5">
            {fetching && displaySignals.length === 0 ? (
              <li className="flex items-center gap-2 text-[13px] text-night-soft leading-snug">
                <Loader2
                  className="w-3.5 h-3.5 animate-spin text-night-dim"
                  aria-hidden
                />
                <span>Analyse en cours…</span>
              </li>
            ) : displaySignals.length > 0 ? (
              displaySignals.slice(0, 5).map((sig, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[13px] text-night-soft leading-snug"
                >
                  <span
                    aria-hidden
                    className="shrink-0 w-1.5 h-1.5 rounded-full bg-gold mt-1.5"
                  />
                  <span>{sig.label}</span>
                </li>
              ))
            ) : (
              <li className="flex items-start gap-2 text-[13px] text-night-soft leading-snug">
                <span
                  aria-hidden
                  className="shrink-0 w-1.5 h-1.5 rounded-full bg-gold mt-1.5"
                />
                <span>
                  Cette publication apparaît selon ton réseau et ta récente
                  activité.
                </span>
              </li>
            )}
          </ul>
          <div className="border-t border-line bg-bg-soft p-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => sendFeedback("see_less")}
              className="w-full flex items-center gap-2 px-3 h-10 rounded-lg hover:bg-white text-[13px] text-night text-left transition-colors disabled:opacity-60"
            >
              <ThumbsDown className="w-4 h-4 text-night-dim" aria-hidden />
              Voir moins de ce type de contenu
            </button>
            {authorId ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => sendFeedback("hide_author")}
                className="w-full flex items-center gap-2 px-3 h-10 rounded-lg hover:bg-white text-[13px] text-night text-left transition-colors disabled:opacity-60"
              >
                <UserX className="w-4 h-4 text-night-dim" aria-hidden />
                Ne plus voir cet auteur
              </button>
            ) : null}
            <Link
              href="/settings/algorithm"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-3 h-10 rounded-lg hover:bg-white text-[13px] text-night text-left transition-colors"
            >
              <Settings className="w-4 h-4 text-night-dim" aria-hidden />
              Désactiver les recommandations
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
