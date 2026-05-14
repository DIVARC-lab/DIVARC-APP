"use client";

import { Check, X } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { runAction } from "@/lib/utils/clientAction";
import { respondProConnection } from "../actions";

export function ConnectionRespondActions({
  connectionId,
}: {
  connectionId: string;
}) {
  const [pending, startTransition] = useTransition();

  function handle(status: "accepted" | "rejected") {
    startTransition(async () => {
      await runAction(() => respondProConnection(connectionId, status), {
        successMessage:
          status === "accepted" ? "Connexion acceptée." : "Demande refusée.",
      });
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => handle("rejected")}
        disabled={pending}
        className="text-error hover:bg-error-bg"
      >
        <X className="w-3.5 h-3.5" aria-hidden />
        Refuser
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={() => handle("accepted")}
        loading={pending}
      >
        <Check className="w-3.5 h-3.5" aria-hidden />
        Accepter
      </Button>
    </>
  );
}
