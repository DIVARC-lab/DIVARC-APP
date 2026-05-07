"use client";

import { MessageSquareText } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { contactSeller } from "../../actions";

type ContactSellerButtonProps = {
  listingId: string;
  className?: string;
};

export function ContactSellerButton({
  listingId,
  className,
}: ContactSellerButtonProps) {
  const [pending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const result = await contactSeller(listingId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.friendRequest) {
        toast.success(
          "Demande d'ami envoyée. Tu pourras discuter dès l'acceptation.",
        );
      }
    });
  }

  return (
    <Button
      type="button"
      onClick={handle}
      loading={pending}
      size="lg"
      className={className}
    >
      {!pending ? <MessageSquareText className="w-4 h-4" aria-hidden /> : null}
      Contacter le vendeur
    </Button>
  );
}
