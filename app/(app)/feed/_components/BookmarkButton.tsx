"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { trackEvent } from "@/lib/tracking/eventTracker";
import { toggleBookmark } from "../actions";

type Props = {
  postId: string;
  initialBookmarked: boolean;
};

/* Audit Session 1 #20 — Bold proto BookmarkButton :
   pill h-9 px-3 rounded-full bg #FFF8E8 (cream) text #B88A2A (gold-deep)
   gap-1.5 text-[13px] font-bold, icon 14, label "Sauver" visible.
   État sauvegardé : icon BookmarkCheck (filled visuellement). */
export function BookmarkButton({ postId, initialBookmarked }: Props) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, startTransition] = useTransition();

  function handle() {
    const next = !bookmarked;
    setBookmarked(next);

    /* Track côté recsys — bookmark = signal d'intérêt long terme
       (poids 5 dans EVENT_WEIGHTS). */
    if (next) {
      trackEvent("post.save", { target_post_id: postId });
    }

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
        "inline-flex items-center gap-1.5 h-11 px-3 rounded-full text-[13px] font-bold transition-colors",
        "bg-cream text-gold-deep",
        bookmarked ? "ring-2 ring-gold-deep/25" : "hover:bg-gold/20",
      )}
    >
      {bookmarked ? (
        <BookmarkCheck className="w-[14px] h-[14px]" aria-hidden />
      ) : (
        <Bookmark className="w-[14px] h-[14px]" aria-hidden />
      )}
      <span>{bookmarked ? "Sauvegardé" : "Sauver"}</span>
    </button>
  );
}
