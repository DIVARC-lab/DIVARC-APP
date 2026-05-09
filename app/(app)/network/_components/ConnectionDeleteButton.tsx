"use client";

import { Loader2, X } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { runAction } from "@/lib/utils/clientAction";
import { deleteProConnection } from "../actions";

export function ConnectionDeleteButton({
  connectionId,
  label,
}: {
  connectionId: string;
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  function handle() {
    if (!confirm("Confirmer la suppression ?")) return;
    startTransition(async () => {
      await runAction(() => deleteProConnection(connectionId), {
        successMessage: "Supprimée.",
      });
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handle}
      disabled={pending}
      className="text-red-600 hover:bg-red-50"
    >
      {pending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
      ) : (
        <X className="w-3.5 h-3.5" aria-hidden />
      )}
      {label}
    </Button>
  );
}
