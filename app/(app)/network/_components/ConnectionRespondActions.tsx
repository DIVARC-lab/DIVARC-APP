"use client";

import { Check, X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { respondProConnection } from "../actions";

export function ConnectionRespondActions({
  connectionId,
}: {
  connectionId: string;
}) {
  const [pending, startTransition] = useTransition();

  function handle(status: "accepted" | "rejected") {
    startTransition(async () => {
      const result = await respondProConnection(connectionId, status);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(status === "accepted" ? "Connexion acceptée." : "Demande refusée.");
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
        className="text-red-600 hover:bg-red-50"
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
