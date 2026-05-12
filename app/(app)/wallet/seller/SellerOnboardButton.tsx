"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  status: string;
};

const CTA_LABEL: Record<string, string> = {
  not_started: "Activer les paiements",
  onboarding: "Continuer l'inscription",
  restricted: "Vérifier mes informations",
  enabled: "Ouvrir mon dashboard Stripe",
  disabled: "Voir le détail Stripe",
};

export function SellerOnboardButton({ status }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      /* Pour 'enabled' on demande le dashboard URL ; sinon onboarding URL. */
      const endpoint =
        status === "enabled"
          ? "/api/stripe/connect/onboarding"
          : "/api/stripe/connect/onboarding";
      const method = status === "enabled" ? "GET" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
      });
      const data = (await res.json()) as {
        ok?: boolean;
        url?: string;
        dashboardUrl?: string | null;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Action impossible.");
        return;
      }
      const url = data.url ?? data.dashboardUrl;
      if (url) window.location.href = url;
      else toast.error("Lien Stripe indisponible.");
    } catch {
      toast.error("Action impossible. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-gradient-to-br from-gold to-gold-deep text-night font-extrabold text-[14px] shadow-[0_8px_22px_-8px_rgba(244,185,66,0.55)] hover:opacity-95 transition-opacity disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
      ) : (
        <ArrowRight className="w-4 h-4" aria-hidden />
      )}
      {CTA_LABEL[status] ?? "Continuer"}
    </button>
  );
}
