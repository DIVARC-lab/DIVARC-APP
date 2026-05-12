"use client";

import { Loader2, MessageCircle } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { contactSeller } from "../../actions";
import { cn } from "@/lib/utils/cn";

type ContactSellerButtonProps = {
  listingId: string;
  sellerName: string;
  /* iconOnly : bouton rond compact (utile quand "Acheter" prend la place
   * de pole sur le sticky CTA). */
  iconOnly?: boolean;
};

export function ContactSellerButton({
  listingId,
  sellerName,
  iconOnly = false,
}: ContactSellerButtonProps) {
  const [pending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const result = await contactSeller(listingId);
      if (result?.error) {
        toast.error(result.error);
      }
      /* Si succès, l'action redirige vers /marketplace/messages/[id]. */
    });
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        aria-label={`Discuter avec ${sellerName}`}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-line text-night hover:border-gold/40 transition-colors shrink-0 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="w-[18px] h-[18px] animate-spin" aria-hidden />
        ) : (
          <MessageCircle className="w-[18px] h-[18px]" aria-hidden />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className={cn(
        "flex-1 inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full",
        "bg-gradient-to-br from-gold to-gold-deep text-night font-extrabold text-[14px]",
        "shadow-[0_12px_24px_-10px_rgba(244,185,66,0.6)] hover:opacity-95 transition-opacity disabled:opacity-60",
      )}
    >
      {pending ? (
        <Loader2 className="w-[15px] h-[15px] animate-spin" aria-hidden />
      ) : (
        <MessageCircle className="w-[15px] h-[15px]" aria-hidden />
      )}
      Discuter{sellerName ? ` avec ${sellerName.split(" ")[0]}` : ""}
    </button>
  );
}
