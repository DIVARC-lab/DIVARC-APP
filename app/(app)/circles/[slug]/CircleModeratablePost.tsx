"use client";

import { Pin, PinOff } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import type { PostWithDetails } from "@/lib/database.types";
import { PostCard } from "@/app/(app)/feed/_components/PostCard";
import { pinCirclePost, unpinCirclePost } from "../actions";
import { ReportButton } from "./_components/ReportButton";
import { SummarizeThreadButton } from "./_components/SummarizeThreadButton";

type CircleModeratablePostProps = {
  post: PostWithDetails;
  currentUserId: string;
  canModerate: boolean;
  /* Sprint J — passé pour le bouton ReportButton (revalidatePath
     ciblée). Optionnel pour back-compat ; si absent, bouton caché. */
  circleSlug?: string;
};

export function CircleModeratablePost({
  post,
  currentUserId,
  canModerate,
  circleSlug,
}: CircleModeratablePostProps) {
  const [pending, startTransition] = useTransition();
  const isPinned = !!post.pinned_at;

  const handleToggle = () => {
    startTransition(async () => {
      const result = isPinned
        ? await unpinCirclePost(post.id)
        : await pinCirclePost(post.id);
      if (!result.ok) {
        toast.error(result.error ?? "Action impossible.");
      } else {
        toast.success(isPinned ? "Désépinglé." : "Épinglé en haut.");
      }
    });
  };

  return (
    <div
      className={cn(
        "relative",
        isPinned && "rounded-3xl ring-2 ring-gold/40 ring-offset-2 ring-offset-bg",
      )}
    >
      {isPinned ? (
        <span className="absolute -top-2.5 left-4 z-10 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold text-night text-[10px] font-extrabold tracking-[0.14em] uppercase shadow-soft">
          <Pin className="w-2.5 h-2.5" aria-hidden />
          Épinglé
        </span>
      ) : null}
      {canModerate ? (
        <button
          type="button"
          onClick={handleToggle}
          disabled={pending}
          aria-label={isPinned ? "Désépingler" : "Épingler"}
          title={isPinned ? "Désépingler" : "Épingler en haut du cercle"}
          className={cn(
            "absolute top-3 right-3 z-10 w-8 h-8 rounded-full border flex items-center justify-center transition-colors disabled:opacity-50",
            isPinned
              ? "bg-gold text-night border-gold-deep hover:bg-gold-soft"
              : "bg-white/95 text-night-muted border-line hover:border-gold hover:text-gold-deep",
          )}
        >
          {isPinned ? (
            <PinOff className="w-3.5 h-3.5" aria-hidden />
          ) : (
            <Pin className="w-3.5 h-3.5" aria-hidden />
          )}
        </button>
      ) : null}
      <PostCard post={post} currentUserId={currentUserId} />
      {/* Sprint G.2 + J — outils inline sous le post (résumé thread,
          signalement). Les non-auteurs voient "Signaler". */}
      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
        <SummarizeThreadButton
          postId={post.id}
          commentsCount={post.comments_count ?? 0}
        />
        {circleSlug &&
        post.circle_id &&
        post.author_id !== currentUserId ? (
          <ReportButton
            circleId={post.circle_id}
            circleSlug={circleSlug}
            targetKind="post"
            targetId={post.id}
          />
        ) : null}
      </div>
    </div>
  );
}
