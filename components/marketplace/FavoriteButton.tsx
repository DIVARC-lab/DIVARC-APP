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

  const dimensions = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconSize = size === "sm" ? "w-4 h-4" : "w-4.5 h-4.5";

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={cn(
        "flex items-center justify-center rounded-full bg-white/95 backdrop-blur-sm border transition-all",
        favorited
          ? "border-red-200 text-red-500"
          : "border-line text-night-muted hover:text-red-500 hover:border-red-200",
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
