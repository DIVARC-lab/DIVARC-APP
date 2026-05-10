import { CreditCard, Download, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { listMyAdAccounts } from "@/lib/queries/ads";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Facturation Ads" };

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accounts = await listMyAdAccounts();
  const accountIds = accounts.map((a) => a.id);

  /* Charges récentes — finance + admin uniquement (RLS). */
  const { data: charges } = accountIds.length > 0
    ? await supabase
        .from("ads_charges")
        .select("*")
        .in("ad_account_id", accountIds)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  return (
    <div className="px-5 sm:px-8 py-8 max-w-5xl mx-auto">
      <header className="mb-7">
        <KickerLabel>· Facturation</KickerLabel>
        <DisplayHeading
          size="lg"
          className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
        >
          Solde &amp; <em className="italic text-gold-deep">facturation</em>
        </DisplayHeading>
        <p className="mt-3 text-[14px] text-night-soft max-w-2xl leading-relaxed">
          DIVARC Ads V1 fonctionne en <strong>pré-paiement</strong> : tu
          alimentes ton compte par virement, ton solde est débité au fur et à
          mesure de la diffusion. Stripe Connect (carte 3DS2 + SEPA Direct
          Debit + factures TVA auto) arrive en V2.
        </p>
      </header>

      {/* Soldes par compte. */}
      <section className="mb-8">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> Soldes par compte
        </h2>
        {accounts.length === 0 ? (
          <p className="rounded-2xl bg-white border border-line p-6 text-center text-[13px] text-night-muted">
            Pas de compte publicitaire. Crée-en un d&apos;abord.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="rounded-2xl bg-white border border-line p-4 flex items-center gap-3"
              >
                <span
                  aria-hidden
                  className="w-10 h-10 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center"
                >
                  <CreditCard className="w-[18px] h-[18px]" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-night truncate">
                    {a.name}
                  </p>
                  <p className="text-[20px] font-bold text-night leading-tight">
                    {Number(a.prepaid_balance).toFixed(2)} {a.currency}
                  </p>
                  <p className="text-[11px] text-night-muted">
                    Total dépensé :{" "}
                    {Number(a.total_spent).toFixed(2)} {a.currency}
                  </p>
                </div>
                <Link
                  href={`mailto:ads@divarc.app?subject=Recharge ${a.id}`}
                  className="text-[12px] font-semibold text-gold-deep hover:underline shrink-0"
                >
                  Recharger
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Procédure recharge V1. */}
      <section className="mb-8">
        <div className="rounded-2xl bg-bg-soft border border-line p-5 text-[13px] text-night-soft leading-relaxed">
          <p className="font-semibold text-night mb-2 flex items-center gap-2">
            <Plus className="w-4 h-4 text-gold-deep" aria-hidden />
            Comment recharger en V1 ?
          </p>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>
              Envoie un virement à DIVARC SAS — RIB sur demande à{" "}
              <a href="mailto:ads@divarc.app" className="text-gold-deep underline">
                ads@divarc.app
              </a>
              .
            </li>
            <li>
              Mentionne en référence : <code>{`ADS-{ad_account_id}`}</code>{" "}
              (prends-le sur la carte ci-dessus).
            </li>
            <li>
              L&apos;équipe crédite ton solde sous 2 jours ouvrés (entrée en
              comptabilité comme <code>topup</code> dans l&apos;historique).
            </li>
            <li>
              Une facture TVA-conforme (mention contractuelle complète) te
              sera envoyée par email.
            </li>
          </ol>
        </div>
      </section>

      {/* Historique. */}
      <section>
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> Historique des opérations
        </h2>
        {!charges || charges.length === 0 ? (
          <p className="rounded-2xl bg-white border border-line p-6 text-center text-[13px] text-night-muted">
            Aucune opération pour l&apos;instant.
          </p>
        ) : (
          <ul className="rounded-2xl bg-white border border-line overflow-hidden divide-y divide-line">
            {charges.map((c) => (
              <li
                key={c.id}
                className="px-4 py-3 flex items-center gap-3"
              >
                <ChargeTypeBadge type={c.type} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-night truncate">
                    {c.description ?? labelChargeType(c.type)}
                  </p>
                  <p className="text-[11px] text-night-muted">
                    {new Date(c.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    · {c.status}
                  </p>
                </div>
                <span
                  className={`text-[14px] font-bold ${c.type === "topup" ? "text-emerald-700" : c.type === "spend" ? "text-night" : "text-night-muted"}`}
                >
                  {c.type === "topup" ? "+" : "-"}
                  {Number(c.amount).toFixed(2)} {c.currency}
                </span>
                {c.invoice_url ? (
                  <a
                    href={c.invoice_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Télécharger la facture"
                    className="w-8 h-8 rounded-full hover:bg-night/5 text-night-muted hover:text-night flex items-center justify-center"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ChargeTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    topup: "bg-emerald-50 text-emerald-700 border-emerald-200",
    spend: "bg-bg-soft text-night-muted border-line",
    refund: "bg-blue-50 text-blue-700 border-blue-200",
    threshold: "bg-amber-50 text-amber-800 border-amber-200",
    monthly: "bg-amber-50 text-amber-800 border-amber-200",
    manual: "bg-night-muted/10 text-night-muted border-line",
  };
  const labels: Record<string, string> = {
    topup: "Recharge",
    spend: "Dépense",
    refund: "Remb.",
    threshold: "Seuil",
    monthly: "Mensuel",
    manual: "Manuel",
  };
  return (
    <span
      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border shrink-0 ${
        map[type] ?? map.manual
      }`}
    >
      {labels[type] ?? type}
    </span>
  );
}

function labelChargeType(t: string): string {
  return (
    {
      topup: "Recharge du solde",
      spend: "Dépense publicitaire",
      refund: "Remboursement",
      threshold: "Facturation au seuil",
      monthly: "Facture mensuelle",
      manual: "Opération manuelle",
    }[t] ?? t
  );
}
