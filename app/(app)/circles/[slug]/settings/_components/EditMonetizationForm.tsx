"use client";

/* Sprint C — Section "Monétisation" du settings cercle (owner only).
 * 3 modes :
 *  - Pas configuré : explication + bouton "Activer la monétisation"
 *  - Configuré (is_paid=true) : affiche prix actuel + boutons changer/désactiver
 *  - Setup partiel (Stripe pas branché) : redirige vers /wallet/seller
 */

import { Loader2, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  disableCircleMonetization,
  enableCircleMonetization,
  updateCirclePrice,
} from "../../monetization-actions";

type Props = {
  circleId: string;
  circleSlug: string;
  isPaid: boolean;
  priceCents: number | null;
  trialDays: number;
  /* true si owner a un compte Stripe Connect Express enabled. */
  stripeReady: boolean;
};

const PRESETS = [
  { label: "5 €", cents: 500 },
  { label: "10 €", cents: 1000 },
  { label: "19 €", cents: 1900 },
  { label: "29 €", cents: 2900 },
];

export function EditMonetizationForm({
  circleId,
  circleSlug,
  isPaid,
  priceCents,
  trialDays,
  stripeReady,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [priceEuros, setPriceEuros] = useState(
    priceCents ? (priceCents / 100).toFixed(2) : "9.99",
  );
  const [trialInput, setTrialInput] = useState(String(trialDays));
  const [mode, setMode] = useState<"view" | "edit">(isPaid ? "view" : "edit");

  function priceCentsFromInput(): number {
    const n = parseFloat(priceEuros.replace(",", "."));
    if (!Number.isFinite(n) || n < 1) return 0;
    return Math.round(n * 100);
  }

  function trialDaysFromInput(): number {
    const n = parseInt(trialInput, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, 30);
  }

  function handleEnable() {
    const cents = priceCentsFromInput();
    if (cents < 100) {
      toast.error("Prix minimum : 1 €.");
      return;
    }
    startTransition(async () => {
      const res = await enableCircleMonetization({
        circleId,
        circleSlug,
        priceCents: cents,
        trialDays: trialDaysFromInput(),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Monétisation activée ✓");
      window.location.reload();
    });
  }

  function handleUpdatePrice() {
    const cents = priceCentsFromInput();
    if (cents < 100) {
      toast.error("Prix minimum : 1 €.");
      return;
    }
    if (cents === priceCents) {
      toast("Aucun changement.");
      setMode("view");
      return;
    }
    startTransition(async () => {
      const res = await updateCirclePrice({
        circleId,
        circleSlug,
        priceCents: cents,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Nouveau prix appliqué ✓");
      window.location.reload();
    });
  }

  function handleDisable() {
    if (
      !confirm(
        "Désactiver la monétisation ? Les abonnés existants gardent leur accès jusqu'à expiration.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await disableCircleMonetization({ circleId, circleSlug });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Monétisation désactivée.");
      window.location.reload();
    });
  }

  /* ============================================================
   * Cas 1 : Stripe pas configuré
   * ============================================================ */
  if (!stripeReady) {
    return (
      <div className="rounded-2xl bg-bg-soft border border-line p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-4 h-4 mt-0.5 text-gold-deep shrink-0" aria-hidden />
          <div>
            <p className="text-[13px] font-bold text-night">
              Configure d&apos;abord ton compte Stripe Connect
            </p>
            <p className="mt-1 text-[12px] text-night-dim leading-relaxed">
              Pour recevoir les paiements de tes abonnés, tu dois avoir un
              compte Stripe Connect activé. DIVARC retient 10 % de
              commission, tu gardes 90 %.
            </p>
            <Link
              href="/wallet/seller"
              className="mt-3 inline-flex items-center h-9 px-4 rounded-full bg-night text-bg text-[12px] font-bold hover:opacity-90 transition-opacity"
            >
              Configurer Stripe →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
   * Cas 2 : Mode "View" — déjà payant, affiche info
   * ============================================================ */
  if (isPaid && mode === "view") {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-gold/10 to-cream-deep border border-gold/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-gold-deep" aria-hidden />
            <p className="text-[12px] font-bold uppercase tracking-wider text-gold-deep">
              Monétisation active
            </p>
          </div>
          <p className="text-[20px] font-bold text-night">
            {priceCents ? `${(priceCents / 100).toFixed(2)} €` : "—"}{" "}
            <span className="text-[12px] font-normal text-night-dim">
              / mois
            </span>
          </p>
          {trialDays > 0 ? (
            <p className="mt-1 text-[11px] text-night-dim">
              Essai gratuit : {trialDays} jour{trialDays > 1 ? "s" : ""}
            </p>
          ) : null}
          <p className="mt-3 text-[11px] text-night-dim leading-relaxed">
            DIVARC retient 10 %. Tu reçois donc{" "}
            <span className="font-bold text-night">
              {priceCents
                ? `${((priceCents * 0.9) / 100).toFixed(2)} €`
                : "—"}{" "}
              / abonné / mois
            </span>{" "}
            (hors frais Stripe).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className="h-9 px-4 rounded-full bg-white border border-line text-[12px] font-bold text-night hover:border-night/30 transition-colors"
          >
            Changer le prix
          </button>
          <button
            type="button"
            onClick={handleDisable}
            disabled={isPending}
            className="h-9 px-4 rounded-full bg-white border border-line text-[12px] font-bold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            Désactiver
          </button>
          <Link
            href={`/circles/${circleSlug}/revenue`}
            className="ml-auto h-9 inline-flex items-center px-4 rounded-full bg-night text-bg text-[12px] font-bold hover:opacity-90 transition-opacity"
          >
            Revenus →
          </Link>
        </div>
      </div>
    );
  }

  /* ============================================================
   * Cas 3 : Mode "Edit" — créer ou modifier
   * ============================================================ */
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-night-dim leading-relaxed">
        Définis un abonnement mensuel pour réserver l&apos;accès à ce cercle
        à tes membres premium. <strong>DIVARC retient 10 %</strong>, tu
        gardes 90 % (hors frais Stripe).
      </p>

      <div>
        <label
          htmlFor="price-input"
          className="block text-[11px] font-bold uppercase tracking-wider text-night-dim mb-1.5"
        >
          Prix mensuel (€)
        </label>
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p.cents}
              type="button"
              onClick={() => setPriceEuros((p.cents / 100).toFixed(2))}
              className="h-7 px-2.5 rounded-full bg-white border border-line text-[11px] font-bold text-night-dim hover:border-night/30 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          id="price-input"
          type="number"
          min={1}
          max={1000}
          step="0.01"
          value={priceEuros}
          onChange={(e) => setPriceEuros(e.target.value)}
          className="w-full h-10 px-3 rounded-xl border border-line text-[14px] focus:outline-none focus:border-night/30"
        />
        <p className="mt-1 text-[10px] text-night-dim">
          Min 1 € — Max 1 000 € par mois.
        </p>
      </div>

      <div>
        <label
          htmlFor="trial-input"
          className="block text-[11px] font-bold uppercase tracking-wider text-night-dim mb-1.5"
        >
          Essai gratuit (jours)
        </label>
        <input
          id="trial-input"
          type="number"
          min={0}
          max={30}
          step={1}
          value={trialInput}
          onChange={(e) => setTrialInput(e.target.value)}
          disabled={isPaid}
          className="w-full h-10 px-3 rounded-xl border border-line text-[14px] focus:outline-none focus:border-night/30 disabled:bg-bg-soft"
        />
        <p className="mt-1 text-[10px] text-night-dim">
          {isPaid
            ? "Trial figé après activation (V2)."
            : "0 = pas d'essai. Max 30 jours."}
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        {isPaid ? (
          <>
            <Button
              type="button"
              size="sm"
              onClick={handleUpdatePrice}
              loading={isPending}
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : null}
              Mettre à jour
            </Button>
            <button
              type="button"
              onClick={() => setMode("view")}
              disabled={isPending}
              className="h-9 px-4 rounded-full text-[12px] font-bold text-night-dim hover:text-night"
            >
              Annuler
            </button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handleEnable}
            loading={isPending}
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            Activer la monétisation
          </Button>
        )}
      </div>
    </div>
  );
}
