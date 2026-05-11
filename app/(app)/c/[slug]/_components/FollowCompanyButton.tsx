"use client";

import { Building2, Check, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleFollowCompany } from "../actions";
import { cn } from "@/lib/utils/cn";

type Props = {
  companyId: string;
  initialFollowing: boolean;
};

export function FollowCompanyButton({ companyId, initialFollowing }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (pending) return;
    const previous = following;
    setFollowing(!previous);
    startTransition(async () => {
      const res = await toggleFollowCompany(companyId);
      if (!res.ok) {
        setFollowing(previous);
        toast.error(res.error);
        return;
      }
      setFollowing(res.following);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={following}
      className={cn(
        "h-10 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors",
        following
          ? "bg-bg-soft text-night border border-line hover:bg-night/5"
          : "bg-gold-deep text-white hover:bg-gold",
      )}
    >
      {pending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
      ) : following ? (
        <Check className="w-3.5 h-3.5" aria-hidden />
      ) : (
        <Building2 className="w-3.5 h-3.5" aria-hidden />
      )}
      {following ? "Suivi" : "Suivre"}
    </button>
  );
}
