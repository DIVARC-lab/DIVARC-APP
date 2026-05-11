"use client";

import { Heart, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleCloseFriend } from "@/app/(app)/profile/relations-actions";
import { cn } from "@/lib/utils/cn";

/* CloseFriendToggle — toggle "ami proche" (privé, owner only).
 * Style petit, compact pour rail latéral ou menu dropdown. */

type Props = {
  targetUserId: string;
  initial: boolean;
};

export function CloseFriendToggle({ targetUserId, initial }: Props) {
  const [active, setActive] = useState(initial);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (pending) return;
    const previous = active;
    setActive(!previous);
    startTransition(async () => {
      const res = await toggleCloseFriend(targetUserId);
      if (!res.ok) {
        setActive(previous);
        toast.error(res.error);
        return;
      }
      if (typeof res.close_friend === "boolean") {
        setActive(res.close_friend);
      }
      toast.success(res.close_friend ? "Ajouté à tes amis proches." : "Retiré.");
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={active}
      className={cn(
        "h-9 px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors",
        active
          ? "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
          : "bg-white text-night-muted border border-line hover:bg-bg-soft",
      )}
    >
      {pending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
      ) : (
        <Heart
          className={cn("w-3.5 h-3.5", active ? "fill-rose-600" : "")}
          aria-hidden
        />
      )}
      {active ? "Ami proche" : "Ami proche ?"}
    </button>
  );
}
