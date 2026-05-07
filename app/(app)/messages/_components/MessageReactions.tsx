"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";

type ReactionSummary = {
  emoji: string;
  count: number;
  user_reacted: boolean;
};

type MessageReactionsProps = {
  messageId: string;
  reactions: ReactionSummary[];
  isOwn: boolean;
};

export function MessageReactions({
  messageId,
  reactions,
  isOwn,
}: MessageReactionsProps) {
  const [pending, startTransition] = useTransition();

  if (reactions.length === 0) return null;

  function toggle(emoji: string, userReacted: boolean) {
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (userReacted) {
        const { error } = await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id)
          .eq("emoji", emoji);
        if (error) toast.error("Impossible de retirer la réaction.");
      } else {
        const { error } = await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });
        if (error) toast.error("Impossible d'ajouter la réaction.");
      }
    });
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 mt-1 px-1",
        isOwn ? "justify-end" : "justify-start",
      )}
    >
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          onClick={() => toggle(reaction.emoji, reaction.user_reacted)}
          disabled={pending}
          aria-pressed={reaction.user_reacted}
          className={cn(
            "inline-flex items-center gap-1 px-2 h-6 rounded-full border text-xs font-medium transition-all",
            reaction.user_reacted
              ? "bg-gold/15 border-gold/40 text-night"
              : "bg-white border-line text-night-muted hover:border-night/30",
          )}
        >
          <span aria-hidden>{reaction.emoji}</span>
          {reaction.count > 1 ? <span>{reaction.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
