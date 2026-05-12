import { ArrowLeft, CheckCircle2, ExternalLink, Wallet2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SellerOnboardButton } from "./SellerOnboardButton";

export const metadata = {
  title: "Activer les paiements",
};

const STATUS_META: Record<
  string,
  { kicker: string; title: string; body: string; color: string }
> = {
  not_started: {
    kicker: "Pas encore commencé",
    title: "Active les paiements pour vendre.",
    body: "DIVARC utilise Stripe Connect Express. L'inscription prend 5 minutes, sécurisée et conforme à la réglementation FR/EU.",
    color: "text-night-dim",
  },
  onboarding: {
    kicker: "Onboarding en cours",
    title: "Termine ton inscription Stripe.",
    body: "Stripe a besoin de quelques informations supplémentaires (identité, IBAN). Continue là où tu t'es arrêté.",
    color: "text-amber-600",
  },
  restricted: {
    kicker: "En attente de Stripe",
    title: "Stripe vérifie tes informations.",
    body: "Tu peux déjà publier des annonces, mais les acheteurs ne pourront pas encore payer en ligne tant que Stripe n'a pas validé.",
    color: "text-amber-600",
  },
  enabled: {
    kicker: "Tout est prêt",
    title: "Tu peux recevoir des paiements.",
    body: "Les fonds sont versés automatiquement sur ton compte bancaire selon la fréquence configurée dans Stripe (J+7 par défaut).",
    color: "text-emerald-600",
  },
  disabled: {
    kicker: "Compte désactivé",
    title: "Stripe a désactivé ton compte.",
    body: "Connecte-toi à ton dashboard Stripe pour comprendre la raison et la résoudre.",
    color: "text-red-600",
  },
};

export default async function SellerOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "stripe_connect_account_id, stripe_connect_status, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted",
    )
    .eq("id", user.id)
    .maybeSingle();

  const status = profile?.stripe_connect_status ?? "not_started";
  const meta = STATUS_META[status] ?? STATUS_META.not_started!;

  return (
    <div className="bg-bg-soft min-h-[calc(100dvh-56px)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <Link
          href="/wallet"
          className="inline-flex items-center gap-2 text-[12px] text-night-dim hover:text-night mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
          Retour au wallet
        </Link>

        <span
          className={`text-[11px] font-extrabold uppercase tracking-[0.18em] ${meta.color}`}
        >
          · {meta.kicker}
        </span>
        <h1 className="mt-1 font-display text-[28px] sm:text-[42px] text-night text-balance leading-[1.05]">
          {meta.title}
        </h1>
        <p className="mt-2 text-[14px] text-night-soft leading-relaxed max-w-prose">
          {meta.body}
        </p>

        {/* Status checks */}
        <div className="mt-6 rounded-2xl bg-white border border-line divide-y divide-line overflow-hidden">
          <StatusRow
            label="Informations complétées"
            ok={!!profile?.stripe_details_submitted}
          />
          <StatusRow
            label="Paiements activés"
            ok={!!profile?.stripe_charges_enabled}
          />
          <StatusRow
            label="Virements vers ta banque activés"
            ok={!!profile?.stripe_payouts_enabled}
          />
        </div>

        {/* CTA */}
        <div className="mt-6 flex flex-col gap-3">
          <SellerOnboardButton status={status} />

          {status === "enabled" ? (
            <Link
              href="/marketplace/new"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-white border border-line text-night text-[13px] font-bold hover:border-gold/40 transition-colors"
            >
              <Wallet2 className="w-4 h-4" aria-hidden />
              Publier une annonce
            </Link>
          ) : null}
        </div>

        {/* Info commission */}
        <div className="mt-8 rounded-2xl bg-night text-cream p-5 flex items-start gap-3">
          <ExternalLink
            className="w-4 h-4 mt-0.5 text-gold shrink-0"
            aria-hidden
          />
          <div>
            <p className="text-[12px] font-bold text-cream">
              Commission DIVARC : 5% par transaction
            </p>
            <p className="mt-1 text-[12px] text-cream/70 leading-relaxed">
              Tu reçois 95% du prix de vente sur ton compte bancaire. Stripe
              prélève ses propres frais (1,4% + 0,25€ pour cartes EU).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-[13px] text-night">{label}</span>
      {ok ? (
        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-600">
          <CheckCircle2 className="w-4 h-4" aria-hidden />
          Activé
        </span>
      ) : (
        <span className="text-[11px] font-semibold text-night-dim">
          En attente
        </span>
      )}
    </div>
  );
}
