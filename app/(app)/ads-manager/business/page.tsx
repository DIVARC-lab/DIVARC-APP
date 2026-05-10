import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { getMyBusinessAccounts, listMyAdAccounts } from "@/lib/queries/ads";
import { createClient } from "@/lib/supabase/server";
import { BusinessForm } from "./BusinessForm";
import { AdAccountForm } from "./AdAccountForm";

export const metadata = { title: "Compte entreprise" };

type SearchParams = Promise<{ action?: string }>;

export default async function BusinessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { action } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [businesses, accounts] = await Promise.all([
    getMyBusinessAccounts(),
    listMyAdAccounts(),
  ]);

  const showNewBusiness = businesses.length === 0 || action === "new-business";
  const showNewAdAccount = action === "new-account" && businesses.length > 0;

  return (
    <div className="px-5 sm:px-8 py-8 max-w-3xl mx-auto">
      <Link
        href="/ads-manager"
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
      >
        ← Vue d&apos;ensemble
      </Link>

      <header className="mb-7">
        <KickerLabel>· Entreprise</KickerLabel>
        <DisplayHeading
          size="lg"
          className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
        >
          {showNewBusiness
            ? "Crée ton compte entreprise"
            : "Mon compte entreprise"}
        </DisplayHeading>
      </header>

      {showNewBusiness ? (
        <BusinessForm />
      ) : (
        <>
          <section className="mb-8">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
              <span className="text-gold-deep">·</span> Informations légales
            </h2>
            {businesses.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl bg-white border border-line p-5 space-y-2 text-[13px]"
              >
                <p>
                  <strong className="text-night">{b.legal_name}</strong>
                </p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-night-soft">
                  <KV label="Forme juridique" value={b.legal_form ?? "—"} />
                  <KV label="SIRET" value={b.siret ?? "Non renseigné"} />
                  <KV label="TVA" value={b.vat_number ?? "—"} />
                  <KV label="Industrie" value={b.industry ?? "—"} />
                  <KV
                    label="Statut KYB"
                    value={labelVerification(b.verification_status)}
                  />
                  <KV label="Email contact" value={b.primary_contact_email} />
                </dl>
                <p className="text-[11px] text-night-muted pt-2">
                  KYB complet (K-bis + ID dirigeant) requis à partir de 5 000
                  €/mois de dépense. Pour soumettre, contacte{" "}
                  <a
                    href="mailto:ads@divarc.app"
                    className="text-gold-deep hover:underline"
                  >
                    ads@divarc.app
                  </a>
                  .
                </p>
              </div>
            ))}
          </section>

          <section className="mb-8">
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
                <span className="text-gold-deep">·</span> Comptes publicitaires
              </h2>
              <Link
                href="/ads-manager/business?action=new-account"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gold-deep hover:underline"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden />
                Nouveau
              </Link>
            </div>
            {showNewAdAccount ? (
              <AdAccountForm businessId={businesses[0]!.id} />
            ) : accounts.length === 0 ? (
              <p className="rounded-2xl bg-white border border-line p-5 text-[13px] text-night-muted">
                Aucun compte publicitaire. Crée-en un pour lancer ta première
                campagne.
              </p>
            ) : (
              <ul className="rounded-2xl bg-white border border-line overflow-hidden divide-y divide-line">
                {accounts.map((a) => (
                  <li
                    key={a.id}
                    className="px-4 py-3 flex items-center gap-3"
                  >
                    <span
                      aria-hidden
                      className="w-9 h-9 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center"
                    >
                      <Building2 className="w-4 h-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-night">
                        {a.name}
                      </p>
                      <p className="text-[11.5px] text-night-muted">
                        {a.currency} · {a.role} · solde{" "}
                        {Number(a.prepaid_balance).toFixed(2)} {a.currency}
                      </p>
                    </div>
                    <Link
                      href={`/ads-manager/${a.id}`}
                      className="text-[12px] text-gold-deep hover:underline"
                    >
                      Ouvrir →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd className="text-night">{value}</dd>
    </div>
  );
}

function labelVerification(s: string): string {
  return (
    {
      pending: "Non démarrée",
      submitted: "En cours",
      verified: "Vérifié",
      rejected: "Rejetée",
    }[s] ?? s
  );
}
