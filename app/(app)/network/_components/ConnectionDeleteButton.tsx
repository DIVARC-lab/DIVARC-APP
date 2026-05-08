"use client";

import { Loader2, X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
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
      const result = await deleteProConnection(connectionId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Supprimée.");
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
