"use client";

import { ChevronUp, Lightbulb, Loader2 } from "lucide-react";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

type Props = {
  postId: string;
  initialUpvotes: number;
  initialHelpful: number;
  initialMyUpvote: boolean;
  initialMyHelpful: boolean;
};

/* Boutons upvote + helpful (toggle via RPC toggle_circle_post_vote). */
export function CircleVoteButtons({
  postId,
  initialUpvotes,
  initialHelpful,
  initialMyUpvote,
  initialMyHelpful,
}: Props) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [helpful, setHelpful] = useState(initialHelpful);
  const [myUpvote, setMyUpvote] = useState(initialMyUpvote);
  const [myHelpful, setMyHelpful] = useState(initialMyHelpful);
  const [pending, startTransition] = useTransition();

  function toggle(voteType: "upvote" | "helpful") {
    /* Optimistic update. */
    if (voteType === "upvote") {
      const next = !myUpvote;
      setMyUpvote(next);
      setUpvotes((c) => Math.max(c + (next ? 1 : -1), 0));
    } else {
      const next = !myHelpful;
      setMyHelpful(next);
      setHelpful((c) => Math.max(c + (next ? 1 : -1), 0));
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("toggle_circle_post_vote", {
        p_post_id: postId,
        p_vote_type: voteType,
      });
      if (error) {
        /* Rollback. */
        if (voteType === "upvote") {
          setMyUpvote((prev) => !prev);
          setUpvotes((c) => Math.max(c + (myUpvote ? 1 : -1), 0));
        } else {
          setMyHelpful((prev) => !prev);
          setHelpful((c) => Math.max(c + (myHelpful ? 1 : -1), 0));
        }
        toast.error(error.message);
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => toggle("upvote")}
        disabled={pending}
        aria-label={myUpvote ? "Retirer ton vote" : "Voter ce post"}
        aria-pressed={myUpvote}
        className={cn(
          "inline-flex items-center gap-1 h-7 px-2 rounded-full text-[11px] font-bold transition-colors disabled:opacity-50",
          myUpvote
            ? "bg-gold/15 text-gold-deep"
            : "bg-bg-soft text-night-dim hover:bg-line",
        )}
      >
        {pending ? (
          <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
        ) : (
          <ChevronUp className="w-3.5 h-3.5" aria-hidden />
        )}
        <span className="tabular-nums">{upvotes}</span>
      </button>
      <button
        type="button"
        onClick={() => toggle("helpful")}
        disabled={pending}
        aria-label={myHelpful ? "Retirer 'utile'" : "Marquer comme utile"}
        aria-pressed={myHelpful}
        className={cn(
          "inline-flex items-center gap-1 h-7 px-2 rounded-full text-[11px] font-bold transition-colors disabled:opacity-50",
          myHelpful
            ? "bg-emerald-100 text-emerald-700"
            : "bg-bg-soft text-night-dim hover:bg-line",
        )}
      >
        <Lightbulb className="w-3 h-3" aria-hidden />
        <span className="tabular-nums">{helpful}</span>
      </button>
    </div>
  );
}
