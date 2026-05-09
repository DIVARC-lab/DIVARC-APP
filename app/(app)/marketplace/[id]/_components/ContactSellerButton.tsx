"use client";

import { Loader2, Send } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { contactSeller } from "../../actions";

type ContactSellerButtonProps = {
  listingId: string;
  sellerName: string;
};

/* Refonte audit /marketplace/[id] (handoff L205-207) :
   pill h-12 r-full bg gradient gold→#B88A2A weight 800 size 14 + Send icon 15
   shadow [0_12px_24px_-10px_rgba(244,185,66,0.6)]. Texte "Contacter {sellerName}". */
export function ContactSellerButton({
  listingId,
  sellerName,
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
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-gradient-to-br from-gold to-gold-deep text-night font-extrabold text-[14px] shadow-[0_12px_24px_-10px_rgba(244,185,66,0.6)] hover:opacity-95 transition-opacity disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="w-[15px] h-[15px] animate-spin" aria-hidden />
      ) : (
        <Send className="w-[15px] h-[15px]" aria-hidden />
      )}
      Contacter{sellerName ? ` ${sellerName.split(" ")[0]}` : ""}
    </button>
  );
}
