"use client";

import { CheckCircle2, Clock } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { togglePollVote } from "../actions";
import { cn } from "@/lib/utils/cn";

/* PostPoll — affichage interactif d'un sondage attaché à un post.
 *
 * États :
 *   - Non voté : list des options avec progress bar grisée + count = "0 vote"
 *   - Voté : progress bar colorée + pourcentage + "Tu as voté pour…"
 *   - Clôturé : tout en lecture seule, badge "Sondage terminé"
 *
 * V1 : optimistic update côté client + revalidate via server action.
 */

export type PollOption = {
  id: string;
  position: number;
  label: string;
  votes_count: number;
};

export type PollData = {
  id: string;
  question: string;
  multi_choice: boolean;
  is_anonymous: boolean;
  ends_at: string | null;
  total_votes: number;
  options: PollOption[];
  /** IDs des options pour lesquelles le user courant a voté. */
  user_voted_option_ids: string[];
};

type Props = {
  poll: PollData;
  currentUserId: string | null;
};

export function PostPoll({ poll, currentUserId }: Props) {
  const [optimisticPoll, setOptimisticPoll] = useState(poll);
  const [pending, startTransition] = useTransition();

  const isExpired =
    poll.ends_at !== null && new Date(poll.ends_at).getTime() <= Date.now();
  const userVoted = optimisticPoll.user_voted_option_ids.length > 0;
  const canVote = currentUserId !== null && !isExpired;

  function handleVote(optionId: string) {
    if (!canVote || pending) return;

    /* Optimistic update. */
    const wasVoted = optimisticPoll.user_voted_option_ids.includes(optionId);
    const next: PollData = (() => {
      if (wasVoted) {
        return {
          ...optimisticPoll,
          total_votes: Math.max(0, optimisticPoll.total_votes - 1),
          options: optimisticPoll.options.map((o) =>
            o.id === optionId
              ? { ...o, votes_count: Math.max(0, o.votes_count - 1) }
              : o,
          ),
          user_voted_option_ids: optimisticPoll.user_voted_option_ids.filter(
            (id) => id !== optionId,
          ),
        };
      }
      /* Single-choice : retire l'ancien vote. */
      if (!optimisticPoll.multi_choice) {
        const previousIds = optimisticPoll.user_voted_option_ids;
        return {
          ...optimisticPoll,
          total_votes:
            optimisticPoll.total_votes -
            previousIds.length +
            1, /* swap : -previous + 1 nouveau */
          options: optimisticPoll.options.map((o) => {
            if (previousIds.includes(o.id)) {
              return { ...o, votes_count: Math.max(0, o.votes_count - 1) };
            }
            if (o.id === optionId) {
              return { ...o, votes_count: o.votes_count + 1 };
            }
            return o;
          }),
          user_voted_option_ids: [optionId],
        };
      }
      /* Multi-choice : ajoute simplement. */
      return {
        ...optimisticPoll,
        total_votes: optimisticPoll.total_votes + 1,
        options: optimisticPoll.options.map((o) =>
          o.id === optionId ? { ...o, votes_count: o.votes_count + 1 } : o,
        ),
        user_voted_option_ids: [
          ...optimisticPoll.user_voted_option_ids,
          optionId,
        ],
      };
    })();

    setOptimisticPoll(next);

    startTransition(async () => {
      const result = await togglePollVote({
        pollId: optimisticPoll.id,
        optionId,
      });
      if (!result.ok) {
        /* Rollback. */
        setOptimisticPoll(poll);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="px-[18px] pb-3.5">
      <div className="rounded-2xl border border-line bg-bg-soft p-4 space-y-3">
        <p className="text-[14px] font-bold text-night leading-snug">
          {optimisticPoll.question}
        </p>

        <ul className="space-y-1.5">
          {optimisticPoll.options.map((option) => {
            const pct =
              optimisticPoll.total_votes > 0
                ? (option.votes_count / optimisticPoll.total_votes) * 100
                : 0;
            const isUserChoice =
              optimisticPoll.user_voted_option_ids.includes(option.id);
            const showResults = userVoted || isExpired;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => handleVote(option.id)}
                  disabled={!canVote || pending}
                  className={cn(
                    "relative w-full overflow-hidden rounded-xl border text-left px-3 py-2.5 transition-colors",
                    isUserChoice
                      ? "border-night bg-white"
                      : "border-line bg-white hover:border-night/30",
                    !canVote && "cursor-default",
                  )}
                  aria-pressed={isUserChoice}
                >
                  {/* Progress bar absolute background. */}
                  {showResults ? (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-0 left-0 transition-all",
                        isUserChoice ? "bg-gold/30" : "bg-night-muted/10",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  ) : null}

                  <span className="relative flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 min-w-0">
                      {isUserChoice ? (
                        <CheckCircle2
                          className="w-4 h-4 text-gold-deep shrink-0"
                          aria-hidden
                        />
                      ) : null}
                      <span className="text-[13px] font-semibold text-night truncate">
                        {option.label}
                      </span>
                    </span>
                    {showResults ? (
                      <span className="text-[12px] font-bold text-night-muted tabular-nums shrink-0">
                        {pct.toFixed(0)} %
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between text-[11px] text-night-muted">
          <span>
            {optimisticPoll.total_votes}{" "}
            {optimisticPoll.total_votes > 1 ? "votes" : "vote"}
            {optimisticPoll.is_anonymous ? " · anonyme" : ""}
          </span>
          {optimisticPoll.ends_at ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden />
              {isExpired
                ? "Sondage terminé"
                : `Termine ${formatRelativeFuture(optimisticPoll.ends_at)}`}
            </span>
          ) : (
            <span>Sondage illimité</span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelativeFuture(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "à l'instant";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `dans ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `dans ${hours} h`;
  const days = Math.round(hours / 24);
  return `dans ${days} j`;
}
