"use client";

import { Check, Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  approveCirclePost,
  rejectCirclePost,
} from "@/app/(app)/circles/actions";

type Props = {
  postId: string;
};

export function ModerationActionsBar({ postId }: Props) {
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  function approve() {
    startTransition(async () => {
      const result = await approveCirclePost(postId);
      if (!result.ok) toast.error(result.error ?? "Action impossible.");
      else toast.success("Post approuvé.");
    });
  }

  function reject() {
    if (reason.trim().length < 5) {
      toast.error("Précise la raison du refus (5 caractères min).");
      return;
    }
    startTransition(async () => {
      const result = await rejectCirclePost(postId, reason);
      if (!result.ok) toast.error(result.error ?? "Action impossible.");
      else toast.success("Post refusé.");
    });
  }

  if (rejecting) {
    return (
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Raison du refus (visible dans le log)"
          maxLength={1000}
          className="h-9 w-full rounded-xl border border-red-200 bg-white px-3 text-[12px] focus:outline-none focus:border-red-500"
          autoFocus
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setRejecting(false);
              setReason("");
            }}
            disabled={pending}
            className="h-8 px-3 rounded-full text-[11px] font-bold text-night-dim hover:text-night transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={reject}
            disabled={pending || reason.trim().length < 5}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-red-600 text-white text-[11px] font-extrabold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
            ) : (
              <X className="w-3 h-3" aria-hidden />
            )}
            Confirmer le refus
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={approve}
        disabled={pending}
        className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-emerald-600 text-white text-[11px] font-extrabold hover:bg-emerald-700 transition-colors disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
        ) : (
          <Check className="w-3 h-3" aria-hidden />
        )}
        Approuver
      </button>
      <button
        type="button"
        onClick={() => setRejecting(true)}
        disabled={pending}
        className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-red-600 border border-red-200 text-[11px] font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        <X className="w-3 h-3" aria-hidden />
        Refuser
      </button>
    </div>
  );
}
