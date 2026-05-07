"use client";

import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
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
  const [pending, startTransition] = useTransition();

  function handleSold() {
    startTransition(async () => {
      const result = await markListingSold(listingId);
      if (result.ok) {
        toast.success("Annonce marquée comme vendue.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Action impossible.");
      }
    });
  }

  function handleReactivate() {
    startTransition(async () => {
      const result = await reactivateListing(listingId);
      if (result.ok) {
        toast.success("Annonce réactivée.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Action impossible.");
      }
    });
  }

  function handleDelete() {
    if (!confirm("Supprimer définitivement cette annonce ?")) return;
    startTransition(async () => {
      const result = await deleteListing(listingId);
      if (result.ok) {
        toast.success("Annonce supprimée.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Action impossible.");
      }
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
