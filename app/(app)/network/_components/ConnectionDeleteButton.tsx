"use client";

import { Loader2, X } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { runAction } from "@/lib/utils/clientAction";
import { deleteProConnection } from "../actions";

export function ConnectionDeleteButton({
  connectionId,
  label,
}: {
  connectionId: string;
  label: string;
}) {
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  async function handle() {
    const ok = await confirm({
      title: "Retirer cette connexion pro ?",
      description:
        "Vous ne serez plus reliés sur DIVARC. Tu pourras renvoyer une demande plus tard.",
      confirmLabel: "Retirer",
      variant: "destructive",
    });
    if (!ok) return;
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
      className="text-error hover:bg-error-bg"
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
