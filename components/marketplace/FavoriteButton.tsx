"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { toggleFavorite } from "@/app/(app)/marketplace/actions";

type FavoriteButtonProps = {
  listingId: string;
  initialFavorited: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function FavoriteButton({
  listingId,
  initialFavorited,
  size = "md",
  className,
}: FavoriteButtonProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  function handle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    // Optimistic toggle
    const next = !favorited;
    setFavorited(next);
    startTransition(async () => {
      const result = await toggleFavorite(listingId);
      if (!result.ok) {
        setFavorited(!next);
        toast.error(result.error ?? "Action impossible.");
        return;
      }
      setFavorited(result.favorited);
      router.refresh();
    });
  }

  /* Refonte Bold (handoff feed-marketplace L81-83) :
     sm = w-[30px] h-[30px] r-[15px] bg cream/92 backdrop-blur
     md = w-10 h-10 (utilisé sur la page détail)
     icon 13x13 (sm) ou 18x18 (md), color navy par défaut, red si favori. */
  const dimensions = size === "sm" ? "w-[30px] h-[30px]" : "w-10 h-10";
  const iconSize =
    size === "sm" ? "w-[13px] h-[13px]" : "w-[18px] h-[18px]";

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={cn(
        "flex items-center justify-center rounded-full backdrop-blur-md transition-colors",
        size === "sm"
          ? "bg-bg-soft/92"
          : "bg-white/95 border border-line",
        favorited ? "text-[#E0405D]" : "text-night hover:text-[#E0405D]",
        dimensions,
        pending && "opacity-70",
        className,
      )}
    >
      <Heart
        className={cn(
          iconSize,
          favorited ? "fill-current" : "fill-transparent",
        )}
        aria-hidden
      />
    </button>
  );
}
