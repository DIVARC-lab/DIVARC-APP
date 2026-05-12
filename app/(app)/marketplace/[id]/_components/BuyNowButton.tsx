"use client";

import { CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  listingId: string;
};

/* Chantier 5 — Bouton "Acheter via DIVARC".
 * Crée une Checkout Session Stripe et redirige vers la page hostée. */
export function BuyNowButton({ listingId }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleBuy() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listingId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.url) {
        toast.error(data.error ?? "Achat impossible pour le moment.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Connexion Stripe impossible. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleBuy}
      disabled={loading}
      className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-gradient-to-br from-gold to-gold-deep text-night font-extrabold text-[14px] shadow-[0_8px_22px_-8px_rgba(244,185,66,0.55)] hover:opacity-95 transition-opacity disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
      ) : (
        <CreditCard className="w-4 h-4" aria-hidden />
      )}
      {loading ? "Redirection…" : "Acheter via DIVARC"}
    </button>
  );
}
