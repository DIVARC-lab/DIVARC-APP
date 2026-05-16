"use client";

/* Rendu inline d'un message type=poll dans une bulle de chat.
 *
 * - Question en haut
 * - Options avec barres % gold animées
 * - Mes votes en gold rempli, autres en outline
 * - Footer : total votes + badge multiple/anonyme
 * - Click sur option → toggle vote (RPC) */

import { BarChart3, Check, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { voteMessagePoll } from "../poll-actions";

type Poll = {
  id: string;
  question: string;
  options: Array<{ id: string; text: string }>;
  is_multiple_choice: boolean;
  is_anonymous: boolean;
  closes_at: string | null;
  closed_at: string | null;
};

type Props = {
  messageId: string;
};

export function PollMessageInline({ messageId }: Props) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [votes, setVotes] = useState<Map<string, Set<string>>>(new Map());
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [pendingOptId, setPendingOptId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const supabase = createClient();

    async function fetchAll() {
      /* Fetch poll. */
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data: p } = await (supabase as any)
        .from("message_polls")
        .select("*")
        .eq("message_id", messageId)
        .maybeSingle();
      if (!alive) return;
      if (!p) {
        setLoading(false);
        return;
      }
      setPoll(p as Poll);

      /* Fetch votes aggregated. */
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data: vs } = await (supabase as any)
        .from("message_poll_votes")
        .select("option_id, user_id")
        .eq("poll_id", (p as Poll).id);
      if (!alive) return;
      const byOption = new Map<string, Set<string>>();
      const mineSet = new Set<string>();
      const { data: userRes } = await supabase.auth.getUser();
      const me = userRes.user?.id ?? null;
      for (const v of (vs ?? []) as Array<{
        option_id: string;
        user_id: string;
      }>) {
        if (!byOption.has(v.option_id)) byOption.set(v.option_id, new Set());
        byOption.get(v.option_id)!.add(v.user_id);
        if (me && v.user_id === me) mineSet.add(v.option_id);
      }
      setVotes(byOption);
      setMyVotes(mineSet);
      setLoading(false);
    }

    void fetchAll();

    /* Realtime sur message_poll_votes. */
    const channel = supabase
      .channel(`poll-votes-${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_poll_votes",
        },
        () => {
          void fetchAll();
        },
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [messageId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-night-dim">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        <span className="text-[12px]">Chargement sondage…</span>
      </div>
    );
  }

  if (!poll) {
    return (
      <p className="text-[12px] text-night-dim italic">
        Sondage non trouvé.
      </p>
    );
  }

  const totalVotes = Array.from(votes.values()).reduce(
    (sum, set) => sum + set.size,
    0,
  );
  const isClosed = !!poll.closed_at;

  function handleVote(optionId: string) {
    if (isPending || isClosed) return;
    setPendingOptId(optionId);
    startTransition(async () => {
      const res = await voteMessagePoll({
        pollId: poll!.id,
        optionId,
      });
      setPendingOptId(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
    });
  }

  return (
    <div className="space-y-2.5 my-1 min-w-[240px]">
      <div className="flex items-start gap-2">
        <BarChart3
          className="w-3.5 h-3.5 text-gold-deep mt-0.5 shrink-0"
          aria-hidden
        />
        <p className="text-[13px] font-bold text-night leading-snug">
          {poll.question}
        </p>
      </div>

      <ul className="space-y-1.5">
        {poll.options.map((opt) => {
          const optVotes = votes.get(opt.id)?.size ?? 0;
          const percent =
            totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
          const voted = myVotes.has(opt.id);
          const loading = isPending && pendingOptId === opt.id;
          return (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => handleVote(opt.id)}
                disabled={isPending || isClosed}
                className={`w-full relative overflow-hidden text-left px-3 py-2 rounded-xl border transition-colors ${
                  voted
                    ? "bg-gold/15 border-gold/50"
                    : "bg-bg-soft border-line hover:bg-cream"
                } disabled:opacity-60`}
              >
                {/* Barre gold pour pourcentage. */}
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 bg-gold/25 transition-[width] duration-500 ease-out"
                  style={{ width: `${percent}%` }}
                />
                <span className="relative flex items-center gap-2">
                  {loading ? (
                    <Loader2
                      className="w-3 h-3 animate-spin text-gold-deep"
                      aria-hidden
                    />
                  ) : voted ? (
                    <Check
                      className="w-3 h-3 text-gold-deep"
                      aria-hidden
                      strokeWidth={2.6}
                    />
                  ) : (
                    <span className="w-3 h-3 rounded-full border border-night-dim" />
                  )}
                  <span className="flex-1 text-[12.5px] text-night truncate">
                    {opt.text}
                  </span>
                  <span className="text-[11px] font-extrabold tabular-nums text-night-dim">
                    {percent}%
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-2 text-[10.5px] text-night-dim">
        <span className="tabular-nums">
          {totalVotes} vote{totalVotes > 1 ? "s" : ""}
        </span>
        {poll.is_multiple_choice ? (
          <span className="inline-flex items-center h-4 px-1.5 rounded-sm bg-bg-soft border border-line text-[9px] font-bold uppercase">
            Multiple
          </span>
        ) : null}
        {poll.is_anonymous ? (
          <span className="inline-flex items-center h-4 px-1.5 rounded-sm bg-bg-soft border border-line text-[9px] font-bold uppercase">
            Anonyme
          </span>
        ) : null}
        {isClosed ? (
          <span className="inline-flex items-center h-4 px-1.5 rounded-sm bg-night text-cream text-[9px] font-bold uppercase">
            Clôturé
          </span>
        ) : null}
      </div>
    </div>
  );
}
