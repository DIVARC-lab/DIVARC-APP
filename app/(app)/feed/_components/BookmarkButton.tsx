"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { toggleBookmark } from "../actions";

type Props = {
  postId: string;
  initialBookmarked: boolean;
};

export function BookmarkButton({ postId, initialBookmarked }: Props) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, startTransition] = useTransition();

  function handle() {
    const next = !bookmarked;
    setBookmarked(next);
    startTransition(async () => {
      const result = await toggleBookmark(postId);
      if (!result.ok) {
        setBookmarked(!next);
        toast.error("Action impossible.");
        return;
      }
      if (result.bookmarked) {
        toast.success("Sauvegardé dans tes favoris.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "Retirer des favoris" : "Sauvegarder"}
      className={cn(
        "inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-colors",
        bookmarked
          ? "bg-gold/15 text-gold-deep border border-gold/40"
          : "bg-night/5 text-night-muted hover:bg-night/10 hover:text-night",
      )}
    >
      {bookmarked ? (
        <BookmarkCheck className="w-4 h-4" aria-hidden />
      ) : (
        <Bookmark className="w-4 h-4" aria-hidden />
      )}
    </button>
  );
}
