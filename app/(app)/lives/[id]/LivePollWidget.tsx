"use client";

/* Étape 11 — Widget poll live (viewer side).
 *
 * Polling 2s sur /api/lives/[id]/poll. Affiche le poll actif si présent
 * avec progress bars + vote button. Si pas voté → boutons d'option, si
 * voté → résultats + check sur sa réponse. Si is_closed → message
 * "Sondage terminé". */

import { CheckCircle2, Vote } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { voteLivePoll } from "../poll-actions";

type PollResults = {
  id: string;
  question: string;
  options: string[];
  counts: number[];
  total_votes: number;
  my_vote: number | null;
  ends_at: string;
  is_closed: boolean;
};

type Props = {
  sessionId: string;
};

export function LivePollWidget({ sessionId }: Props) {
  const [poll, setPoll] = useState<PollResults | null>(null);
  const [voting, setVoting] = useState(false);
  const aliveRef = useRef(true);

  const fetchPoll = useCallback(async () => {
    try {
      const res = await fetch(`/api/lives/${sessionId}/poll`, {
        cache: "no-store",
      });
      if (!res.ok) {
        if (aliveRef.current) setPoll(null);
        return;
      }
      const data = (await res.json()) as PollResults | null;
      if (aliveRef.current) {
        setPoll(data);
      }
    } catch {
      /* ignore */
    }
  }, [sessionId]);

  useEffect(() => {
    aliveRef.current = true;
    fetchPoll();
    const interval = window.setInterval(fetchPoll, 2500);
    return () => {
      aliveRef.current = false;
      window.clearInterval(interval);
    };
  }, [fetchPoll]);

  if (!poll) return null;

  const ended =
    poll.is_closed || new Date(poll.ends_at).getTime() < Date.now();
  const total = Math.max(poll.total_votes, 1);

  async function handleVote(idx: number) {
    if (poll === null) return;
    if (poll.my_vote !== null) return;
    if (ended) return;
    setVoting(true);
    try {
      const res = await voteLivePoll({
        pollId: poll.id,
        optionIndex: idx,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      /* Refresh immédiat sans attendre le polling. */
      await fetchPoll();
    } finally {
      setVoting(false);
    }
  }

  return (
    <div className="rounded-2xl bg-night/90 backdrop-blur-md border border-cream/10 p-4 text-cream shadow-2xl">
      <div className="flex items-center gap-1.5 mb-3">
        <Vote className="w-3.5 h-3.5 text-gold" aria-hidden />
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-gold">
          {ended ? "Sondage terminé" : "Sondage en cours"}
        </p>
        {!ended ? <RemainingTime endsAt={poll.ends_at} /> : null}
      </div>
      <p className="text-[14px] font-bold leading-snug mb-3">
        {poll.question}
      </p>
      <ul className="space-y-1.5">
        {poll.options.map((opt, idx) => {
          const count = poll.counts[idx] ?? 0;
          const pct = Math.round((count / total) * 100);
          const isMy = poll.my_vote === idx;
          const canVote = poll.my_vote === null && !ended;
          return (
            <li key={idx}>
              <button
                type="button"
                onClick={() => handleVote(idx)}
                disabled={!canVote || voting}
                className={`relative w-full text-left rounded-xl border overflow-hidden transition-colors ${
                  isMy
                    ? "border-gold bg-gold/10"
                    : canVote
                      ? "border-cream/20 hover:border-cream/40 bg-cream/5"
                      : "border-cream/10 bg-cream/5"
                } ${canVote && !voting ? "cursor-pointer" : "cursor-default"}`}
              >
                {/* Progress bar fond */}
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                    isMy ? "bg-gold/20" : "bg-cream/10"
                  }`}
                  style={{ width: `${pct}%` }}
                />
                <span className="relative flex items-center justify-between px-3 py-2 text-[12.5px] z-10">
                  <span className="flex items-center gap-1.5">
                    {isMy ? (
                      <CheckCircle2
                        className="w-3.5 h-3.5 text-gold"
                        aria-hidden
                      />
                    ) : null}
                    <span className="font-bold">{opt}</span>
                  </span>
                  <span className="font-bold tabular-nums text-cream/80">
                    {pct}% · {count}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10.5px] text-cream/50 text-center">
        {poll.total_votes} vote{poll.total_votes > 1 ? "s" : ""}
        {poll.my_vote === null && !ended ? " · Choisis ta réponse" : ""}
      </p>
    </div>
  );
}

function RemainingTime({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState(() => {
    return Math.max(
      0,
      Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000),
    );
  });
  useEffect(() => {
    const tick = window.setInterval(() => {
      setRemaining(
        Math.max(
          0,
          Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000),
        ),
      );
    }, 1000);
    return () => window.clearInterval(tick);
  }, [endsAt]);
  return (
    <span className="ml-auto text-[10px] font-bold tabular-nums text-cream/60">
      {remaining}s
    </span>
  );
}
