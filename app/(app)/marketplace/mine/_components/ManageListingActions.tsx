"use client";

import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { runAction } from "@/lib/utils/clientAction";
import {
  deleteListing,
  markListingSold,
  reactivateListing,
} from "../../actions";
import type { ListingStatus } from "@/lib/database.types";

type ManageListingActionsProps = {
  listingId: string;
  status: ListingStatus;
};

export function ManageListingActions({
  listingId,
  status,
}: ManageListingActionsProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  function handleSold() {
    startTransition(async () => {
      const result = await runAction(() => markListingSold(listingId), {
        successMessage: "Annonce marquée comme vendue.",
        errorMessage: "Action impossible.",
      });
      if (result?.ok) router.refresh();
    });
  }

  function handleReactivate() {
    startTransition(async () => {
      const result = await runAction(() => reactivateListing(listingId), {
        successMessage: "Annonce réactivée.",
        errorMessage: "Action impossible.",
      });
      if (result?.ok) router.refresh();
    });
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Supprimer cette annonce ?",
      description: "Cette action est définitive. Les éventuelles offres en attente seront perdues.",
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await runAction(() => deleteListing(listingId), {
        successMessage: "Annonce supprimée.",
        errorMessage: "Action impossible.",
      });
      if (result?.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "active" ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleSold}
          loading={pending}
        >
          {!pending ? <CheckCircle2 className="w-4 h-4" aria-hidden /> : null}
          Marquer vendu
        </Button>
      ) : null}
      {status === "sold" ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleReactivate}
          loading={pending}
        >
          {!pending ? <RotateCcw className="w-4 h-4" aria-hidden /> : null}
          Réactiver
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={pending}
        className="text-red-600 hover:bg-red-50"
      >
        <Trash2 className="w-4 h-4" aria-hidden />
        Supprimer
      </Button>
    </div>
  );
}
