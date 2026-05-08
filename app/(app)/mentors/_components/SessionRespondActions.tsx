"use client";

import { Check, CheckCircle2, X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import type { MentorSessionStatus } from "@/lib/database.types";
import { respondMentorSession } from "../actions";

type Props = {
  sessionId: string;
  status: MentorSessionStatus;
  isMentor: boolean;
};

export function SessionRespondActions({ sessionId, status, isMentor }: Props) {
  const [pending, startTransition] = useTransition();

  function handle(
    next: "confirmed" | "declined" | "completed" | "cancelled",
  ) {
    startTransition(async () => {
      const result = await respondMentorSession(sessionId, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Mis à jour.");
    });
  }

  // Mentor : peut confirmer/décliner si pending, marquer completed si confirmed.
  if (isMentor) {
    if (status === "pending") {
      return (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handle("declined")}
            disabled={pending}
            className="text-red-600 hover:bg-red-50"
          >
            <X className="w-3.5 h-3.5" aria-hidden />
            Refuser
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handle("confirmed")}
            loading={pending}
          >
            <Check className="w-3.5 h-3.5" aria-hidden />
            Confirmer
          </Button>
        </>
      );
    }
    if (status === "confirmed") {
      return (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => handle("completed")}
          loading={pending}
        >
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
          Marquer terminée
        </Button>
      );
    }
    return null;
  }

  // Mentee : peut annuler si pending ou confirmed.
  if (status === "pending" || status === "confirmed") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => handle("cancelled")}
        disabled={pending}
        className="text-red-600 hover:bg-red-50"
      >
        <X className="w-3.5 h-3.5" aria-hidden />
        Annuler
      </Button>
    );
  }
  return null;
}
