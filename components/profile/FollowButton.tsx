"use client";

import { Loader2, UserCheck, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleFollow } from "@/app/(app)/profile/relations-actions";
import { cn } from "@/lib/utils/cn";

/* FollowButton — toggle follow asymétrique (Instagram-style).
 *
 * Disabled si on regarde son propre profil ou si pas authentifié. */

type Props = {
  targetUserId: string;
  initialFollowing: boolean;
  disabled?: boolean;
};

export function FollowButton({
  targetUserId,
  initialFollowing,
  disabled = false,
}: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (disabled || pending) return;
    /* Optimistic */
    const previous = following;
    setFollowing(!previous);
    startTransition(async () => {
      const res = await toggleFollow(targetUserId);
      if (!res.ok) {
        setFollowing(previous);
        toast.error(res.error);
        return;
      }
      if (typeof res.following === "boolean") {
        setFollowing(res.following);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || pending}
      aria-pressed={following}
      className={cn(
        "h-10 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors",
        following
          ? "bg-bg-soft text-night border border-line hover:bg-night/5"
          : "bg-gold-deep text-white hover:bg-gold",
        (disabled || pending) && "opacity-60 cursor-not-allowed",
      )}
    >
      {pending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
      ) : following ? (
        <UserCheck className="w-3.5 h-3.5" aria-hidden />
      ) : (
        <UserPlus className="w-3.5 h-3.5" aria-hidden />
      )}
      {following ? "Suivi(e)" : "Suivre"}
    </button>
  );
}
