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

  /* Audit Session 1 #19 — Bold proto :
     - liked : bg gradient `linear-gradient(135deg,#FEF2F2,#FFE4E4)` color #DC2626
     - unliked : bg transparent color #2A3D6B (= night-soft)
     - h-9 px-[14px] rounded-full font-bold text-[13px], icon 16. */
  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? "Retirer le j'aime" : "Aimer"}
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-[14px] rounded-full transition-colors text-[13px] font-bold",
        liked
          ? "bg-[linear-gradient(135deg,#FEF2F2,#FFE4E4)] text-[#DC2626]"
          : "bg-transparent text-night-soft hover:bg-night/5",
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
