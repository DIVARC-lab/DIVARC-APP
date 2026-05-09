import { ArrowLeft, Banknote, CheckCircle2, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import {
  hasOpenPayoutRequest,
  listMyPayoutRequests,
  listWallets,
} from "@/lib/queries/wallet";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils/currency";
import { formatRelative } from "@/lib/utils/relativeTime";
import { PayoutForm } from "./_components/PayoutForm";
import { PayoutCancelButton } from "./_components/PayoutCancelButton";

export const metadata = {
  title: "Encaisser",
};

const STATUS_META: Record<
  string,
  { label: string; tone: string; icon: typeof Clock }
> = {
  pending: {
    label: "En attente",
    tone: "bg-gold/15 text-gold-deep",
    icon: Clock,
  },
  processing: {
    label: "En traitement",
    tone: "bg-blue-50 text-blue-700",
    icon: Clock,
  },
  completed: {
    label: "Versée",
    tone: "bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejetée",
    tone: "bg-red-50 text-red-600",
    icon: XCircle,
  },
  cancelled: {
    label: "Annulée",
    tone: "bg-night/5 text-night-muted",
    icon: XCircle,
  },
};

export default async function PayoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [wallets, requests, hasOpen] = await Promise.all([
    listWallets(user.id),
    listMyPayoutRequests(user.id),
    hasOpenPayoutRequest(user.id),
  ]);
  const eur = wallets.find((w) => w.currency === "EUR") ?? wallets[0] ?? null;

  return (
    <div className="bg-bg-soft min-h-screen pb-24">
      <div className="mx-auto w-full max-w-2xl">
        {/* Hero header */}
        <header className="relative overflow-hidden bg-gradient-to-b from-cream to-bg-soft px-5 sm:px-8 pt-8 sm:pt-10 pb-7">
          <div
            aria-hidden
            className="absolute -right-12 -top-14 opacity-45 pointer-events-none"
          >
            <ArcDeco size={220} tone="gold" opacity={1} stroke={1.25} />
          </div>
          <div className="relative">
            <Link
              href="/wallet"
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
            >
              <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
              Retour au wallet
            </Link>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
              · Encaissement
            </p>
            <h1 className="mt-2 font-display text-[36px] sm:text-[44px] font-normal leading-[1.05] tracking-[-0.02em] text-night text-balance">
              Vire ton solde sur ton{" "}
              <em className="italic bg-gradient-to-br from-gold to-[#B88A2A] bg-clip-text text-transparent">
                IBAN
              </em>
              .
            </h1>
            <p className="mt-3 text-[14px] text-night-soft leading-relaxed">
              Délai de traitement 1 à 2 jours ouvrés. SEPA uniquement.
              {eur ? (
                <>
                  {" "}
                  Solde disponible :{" "}
                  <strong className="text-night">
                    {formatPrice(eur.balance, eur.currency)}
                  </strong>
                  .
                </>
              ) : null}
            </p>
          </div>
        </header>

        {/* Form ou message si déjà une demande en cours */}
        <section className="px-5 sm:px-8 pt-6">
          {hasOpen ? (
            <div className="rounded-2xl border border-gold/30 bg-gold/[0.06] p-5">
              <div className="flex items-start gap-3">
                <div
                  aria-hidden
                  className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center shrink-0"
                >
                  <Clock className="w-5 h-5 text-gold-deep" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-bold text-night">
                    Une demande est déjà en cours
                  </p>
                  <p className="mt-1 text-xs text-night-muted">
                    Tu peux l&apos;annuler ci-dessous pour récupérer ton solde,
                    ou attendre que l&apos;équipe la traite.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <PayoutForm
              maxAmount={eur?.balance ?? 0}
              currency={eur?.currency ?? "EUR"}
            />
          )}
        </section>

        {/* Historique */}
        <section className="px-5 sm:px-8 pt-8">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-night-dim mb-2">
            · Historique
          </p>
          <h2 className="font-display italic text-2xl text-night leading-tight mb-3">
            Tes demandes
          </h2>
          {requests.length === 0 ? (
            <div className="py-8 text-center rounded-2xl border border-dashed border-line bg-white">
              <Banknote
                className="w-8 h-8 mx-auto text-night-dim mb-2"
                aria-hidden
              />
              <p className="text-sm text-muted">
                Aucune demande pour l&apos;instant.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {requests.map((req) => {
                const meta = STATUS_META[req.status] ?? {
                  label: req.status,
                  tone: "bg-night/5 text-night-muted",
                  icon: Clock,
                };
                const Icon = meta.icon;
                return (
                  <li
                    key={req.id}
                    className="rounded-2xl bg-white border border-line p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display italic text-xl text-night leading-none">
                          {formatPrice(req.amount, req.currency)}
                        </p>
                        <p className="mt-1.5 text-xs text-night-muted truncate">
                          IBAN ··· {req.iban.slice(-4)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {formatRelative(req.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${meta.tone}`}
                        >
                          <Icon className="w-3 h-3" aria-hidden />
                          {meta.label}
                        </span>
                        {req.status === "pending" ? (
                          <PayoutCancelButton requestId={req.id} />
                        ) : null}
                      </div>
                    </div>
                    {req.admin_note ? (
                      <p className="mt-3 p-2.5 rounded-xl bg-bg-soft text-xs text-night-soft italic">
                        Note : {req.admin_note}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
