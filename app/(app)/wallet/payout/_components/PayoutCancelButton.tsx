"use client";

import { Loader2, X } from "lucide-react";
import { useTransition } from "react";
import { runAction } from "@/lib/utils/clientAction";
import { cancelPayout } from "../actions";

export function PayoutCancelButton({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    if (
      !confirm(
        "Annuler la demande ? Ton solde te sera re-crédité immédiatement.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      await runAction(() => cancelPayout(requestId), {
        successMessage: "Demande annulée. Solde re-crédité.",
      });
    });
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={pending}
      className="inline-flex items-center gap-1 h-7 px-2 text-[10px] font-bold text-red-600 hover:bg-red-50 rounded-full transition-colors"
    >
      {pending ? (
        <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
      ) : (
        <X className="w-3 h-3" aria-hidden />
      )}
      Annuler
    </button>
  );
}
