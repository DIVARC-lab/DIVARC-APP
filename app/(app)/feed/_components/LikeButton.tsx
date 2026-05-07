"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { toggleLike } from "../actions";

type LikeButtonProps = {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
};

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
}: LikeButtonProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function handle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));

    startTransition(async () => {
      const result = await toggleLike(postId);
      if (!result.ok) {
        setLiked(!next);
        setCount((c) => c + (next ? -1 : 1));
        toast.error("Action impossible.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? "Retirer le j'aime" : "Aimer"}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 h-9 rounded-full transition-all text-sm font-semibold",
        liked
          ? "bg-red-50 text-red-600"
          : "bg-night/5 text-night-muted hover:bg-night/10 hover:text-night",
      )}
    >
      <Heart
        className={cn(
          "w-4 h-4 transition-transform",
          liked ? "fill-current scale-110" : "fill-transparent scale-100",
        )}
        aria-hidden
      />
      {count > 0 ? count : null}
    </button>
  );
}
