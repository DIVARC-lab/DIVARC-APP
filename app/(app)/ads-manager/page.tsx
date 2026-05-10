import { Building2, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { isCurrentUserAdmin } from "@/lib/queries/admin";
import {
  checkAdsAvailability,
  getMyBusinessAccounts,
  listMyAdAccounts,
} from "@/lib/queries/ads";
import { MigrationsMissingBanner } from "./_components/MigrationsMissingBanner";

export const metadata = { title: "Ads Manager — Vue d'ensemble" };

export default async function AdsManagerHome() {
  const [availability, accounts, businesses, isAdmin] = await Promise.all([
    checkAdsAvailability(),
    listMyAdAccounts(),
    getMyBusinessAccounts(),
    isCurrentUserAdmin(),
  ]);

  return (
    <div className="px-5 sm:px-8 py-8 max-w-6xl mx-auto">
      {availability.reason === "tables_missing" ? (
        <MigrationsMissingBanner isAdmin={isAdmin} />
      ) : null}

      <header className="mb-7">
        <KickerLabel>· Ads Manager</KickerLabel>
        <DisplayHeading
          size="lg"
          className="mt-2 !leading-[1.05] !text-[36px] sm:!text-[44px]"
        >
          Tes <em className="italic text-gold-deep">campagnes publicitaires</em>
        </DisplayHeading>
        <p className="mt-3 text-[14px] text-night-soft max-w-2xl leading-relaxed">
          Crée, gère et analyse tes campagnes pub sur DIVARC : feed, marketplace,
          jobs et stories. Conformité DSA / RGPD intégrée — ciblage 18+
          uniquement, pas de catégories sensibles.
        </p>
      </header>

      {/* Comptes business */}
      {businesses.length === 0 ? (
        <NewBusinessCTA />
      ) : (
        <section className="mb-8">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
            <span className="text-gold-deep">·</span> Mon entreprise
          </h2>
          <ul className="rounded-2xl bg-white border border-line overflow-hidden divide-y divide-line">
            {businesses.map((b) => (
              <li
                key={b.id}
                className="px-4 py-3 flex items-center gap-3"
              >
                <span
                  aria-hidden
                  className="w-9 h-9 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
                >
                  <Building2 className="w-4 h-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-night truncate">
                    {b.legal_name}
                  </p>
                  <p className="text-[11.5px] text-night-muted">
                    {b.legal_form ?? "—"} ·{" "}
                    {b.siret ? `SIRET ${b.siret}` : "SIRET non renseigné"} ·{" "}
                    <span
                      className={
                        b.verification_status === "verified"
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }
                    >
                      {labelVerification(b.verification_status)}
                    </span>
                  </p>
                </div>
                <Link
                  href={`/ads-manager/business`}
                  className="text-[12px] text-gold-deep hover:underline shrink-0"
                >
                  Gérer
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Comptes pub */}
      <section className="mb-8">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
            <span className="text-gold-deep">·</span> Comptes publicitaires (
            {accounts.length})
          </h2>
          {businesses.length > 0 ? (
            <Link
              href="/ads-manager/business?action=new-account"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gold-deep hover:underline"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden />
              Nouveau compte pub
            </Link>
          ) : null}
        </div>
        {accounts.length === 0 ? (
          <p className="rounded-2xl bg-white border border-line p-6 text-center text-[13px] text-night-muted">
            {businesses.length === 0
              ? "Crée d'abord ton compte entreprise pour pouvoir lancer des campagnes."
              : "Pas encore de compte publicitaire. Crée-en un depuis ta page entreprise."}
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accounts.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/ads-manager/${a.id}`}
                  className="block rounded-2xl bg-white border border-line p-4 hover:bg-bg-soft transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                    <p className="text-[14px] font-semibold text-night truncate">
                      {a.name}
                    </p>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-[11.5px] text-night-muted">
                    {a.business_legal_name} ·{" "}
                    {a.role ? labelRole(a.role) : "—"} · {a.currency}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[12px]">
                    <span className="text-night-muted">
                      Solde :{" "}
                      <strong className="text-night">
                        {Number(a.prepaid_balance).toFixed(2)} {a.currency}
                      </strong>
                    </span>
                    <ChevronRight
                      className="w-4 h-4 text-night-dim"
                      aria-hidden
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function NewBusinessCTA() {
  return (
    <section className="mb-8">
      <div className="rounded-2xl bg-white border border-line p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="w-12 h-12 rounded-2xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
          >
            <Building2 className="w-6 h-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold text-night">
              Crée ton compte entreprise pour démarrer
            </h2>
            <p className="text-[13px] text-night-muted mt-1.5 leading-relaxed">
              Avant de lancer une campagne, tu dois renseigner ta raison
              sociale (SIRET, TVA, adresse de facturation). Cela ne prend
              que 2 minutes. Le KYB complet (K-bis + pièce d&apos;identité)
              n&apos;est requis qu&apos;à partir de 5 000 €/mois de
              dépense.
            </p>
            <Link
              href="/ads-manager/business"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full bg-night text-cream text-[13px] font-semibold hover:bg-night/90"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden />
              Créer mon entreprise
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    paused: "bg-amber-50 text-amber-800 border-amber-200",
    suspended: "bg-red-50 text-red-700 border-red-200",
    closed: "bg-night-muted/10 text-night-muted border-line",
  };
  const labels: Record<string, string> = {
    active: "Actif",
    paused: "En pause",
    suspended: "Suspendu",
    closed: "Fermé",
  };
  return (
    <span
      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${
        map[status] ?? map.closed
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function labelVerification(s: string): string {
  return (
    {
      pending: "Vérification non démarrée",
      submitted: "Vérification en cours",
      verified: "Vérifié",
      rejected: "Vérification rejetée",
    }[s] ?? s
  );
}

function labelRole(r: string): string {
  return (
    { admin: "Admin", editor: "Editeur", analyst: "Analyste", finance: "Finance" }[
      r
    ] ?? r
  );
}
