"use client";

import { ArrowLeft, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FavoriteButton } from "@/components/marketplace/FavoriteButton";

type ListingTopBarProps = {
  listingId: string;
  initialFavorited: boolean;
  shareUrl: string;
  shareTitle: string;
};

/* Refonte audit /marketplace/[id] (handoff feed-marketplace L110-116) :
 * Glass top bar absolute over hero gallery :
 * - back : bg-night/55 backdrop-blur color cream icon 16
 * - share : bg-night/55 backdrop-blur color cream icon 15
 * - favorite : bg-white color red filled (proto vermillon #E0405D filled)
 *
 * Tous w-9 h-9 r-full positionnés top-3 left/right-3 (proto top-56 left/right-16
 * en design 390x844 → ~14% du top, mobile-safe via env(safe-area-inset-top)).
 */
export function ListingTopBar({
  listingId,
  initialFavorited,
  shareUrl,
  shareTitle,
}: ListingTopBarProps) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/marketplace");
    }
  }

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url: shareUrl, title: shareTitle });
        return;
      } catch {
        /* User cancelled — fallback clipboard. */
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Lien copié.");
    } catch {
      toast.error("Copie impossible.");
    }
  }

  return (
    <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
      <button
        type="button"
        onClick={handleBack}
        aria-label="Retour"
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-night/55 backdrop-blur-md text-cream hover:bg-night/70 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
      </button>
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={handleShare}
          aria-label="Partager"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-night/55 backdrop-blur-md text-cream hover:bg-night/70 transition-colors"
        >
          <Share2 className="w-[15px] h-[15px]" aria-hidden />
        </button>
        <FavoriteButton
          listingId={listingId}
          initialFavorited={initialFavorited}
          size="md"
          className="!bg-white !border-0 !text-[#E0405D]"
        />
      </div>
    </div>
  );
}
