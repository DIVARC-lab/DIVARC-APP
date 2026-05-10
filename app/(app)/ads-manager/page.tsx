import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Code2,
  Eye,
  Filter,
  KeyRound,
  Layers3,
  LayoutDashboard,
  MousePointerClick,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users2,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { isCurrentUserAdmin } from "@/lib/queries/admin";
import {
  checkAdsAvailability,
  getAggregateAdsStats,
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

  const stats = await getAggregateAdsStats(accounts.map((a) => a.id));
  const totalBalance = accounts.reduce(
    (acc, a) => acc + Number(a.prepaid_balance ?? 0),
    0,
  );
  const primaryCurrency = accounts[0]?.currency ?? "EUR";
  const primaryAccount = accounts[0];
  const hasBusiness = businesses.length > 0;
  const hasAccount = accounts.length > 0;

  return (
    <div className="px-5 sm:px-8 py-8 max-w-6xl mx-auto">
      {availability.reason === "tables_missing" ? (
        <MigrationsMissingBanner isAdmin={isAdmin} />
      ) : null}

      {/* === HERO === */}
      <header className="mb-8">
        <KickerLabel>· Ads Manager</KickerLabel>
        <DisplayHeading
          size="lg"
          className="mt-2 !leading-[1.05] !text-[36px] sm:!text-[44px]"
        >
          Régie publicitaire{" "}
          <em className="italic text-gold-deep">DIVARC</em>
        </DisplayHeading>
        <p className="mt-3 text-[14px] text-night-soft max-w-3xl leading-relaxed">
          Crée, mesure et optimise tes campagnes sur Feed, Marketplace, Jobs
          et Stories. Niveau Google Ads + Meta Ads Manager combinés —
          conformité DSA / RGPD intégrée nativement (ciblage 18+, k-anonymity
          ≥ 100, brand safety auto, ads library publique).
        </p>

        {/* CTA principal — visible que si l'user a au moins 1 compte. */}
        {hasAccount && primaryAccount ? (
          <div className="mt-5 flex items-center gap-2 flex-wrap">
            <Link
              href={`/ads-manager/${primaryAccount.id}/campaigns/new`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-night text-cream text-[13px] font-bold hover:bg-night/90 shadow-soft"
            >
              <Plus className="w-[14px] h-[14px]" aria-hidden />
              Nouvelle campagne
            </Link>
            <Link
              href={`/ads-manager/${primaryAccount.id}/analyzer`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gold/15 border-2 border-gold-deep text-gold-deep text-[13px] font-bold hover:bg-gold/25"
            >
              <Wand2 className="w-[14px] h-[14px]" aria-hidden />
              Analyse IA d&apos;un site
              <Sparkles className="w-[12px] h-[12px]" aria-hidden />
            </Link>
            <Link
              href={`/ads-manager/${primaryAccount.id}/keyword-planner`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white border border-line text-[13px] font-semibold text-night hover:bg-bg-soft"
            >
              <KeyRound className="w-[14px] h-[14px]" aria-hidden />
              Keyword Planner
            </Link>
          </div>
        ) : null}
      </header>

      {/* === BARRE DE STATS GLOBALES === */}
      {hasAccount ? (
        <section className="mb-8">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
              <span className="text-gold-deep">·</span> Vue d&apos;ensemble · 30
              derniers jours
            </h2>
            {stats.pending_review > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-[10px] h-[10px]" aria-hidden />
                {stats.pending_review} en revue conformité
              </span>
            ) : null}
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <StatTile
              icon={LayoutDashboard}
              label="Comptes pub"
              value={String(stats.total_accounts)}
            />
            <StatTile
              icon={TrendingUp}
              label="Campagnes actives"
              value={String(stats.active_campaigns)}
            />
            <StatTile
              icon={BarChart3}
              label="Dépense"
              value={`${stats.total_spend_30d.toFixed(0)} ${primaryCurrency}`}
            />
            <StatTile
              icon={Eye}
              label="Impressions"
              value={formatCompact(stats.total_impressions_30d)}
            />
            <StatTile
              icon={MousePointerClick}
              label="CTR"
              value={`${(stats.ctr_30d * 100).toFixed(2)} %`}
            />
            <StatTile
              icon={ShieldCheck}
              label="Solde total"
              value={`${totalBalance.toFixed(0)} ${primaryCurrency}`}
            />
          </ul>
        </section>
      ) : null}

      {/* === ENTREPRISE === */}
      {!hasBusiness ? (
        <NewBusinessCTA />
      ) : (
        <section className="mb-8">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
              <span className="text-gold-deep">·</span> Mon entreprise (
              {businesses.length})
            </h2>
            <Link
              href="/ads-manager/business"
              className="text-[11.5px] font-semibold text-gold-deep hover:underline inline-flex items-center gap-0.5"
            >
              Gérer
              <ChevronRight className="w-[12px] h-[12px]" aria-hidden />
            </Link>
          </div>
          <ul className="rounded-2xl bg-white border border-line overflow-hidden divide-y divide-line">
            {businesses.map((b) => (
              <li
                key={b.id}
                className="px-4 py-3 flex items-center gap-3"
              >
                <span
                  aria-hidden
                  className="w-10 h-10 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
                >
                  <Building2 className="w-[18px] h-[18px]" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-[14px] font-semibold text-night truncate">
                      {b.legal_name}
                    </p>
                    <VerificationBadge status={b.verification_status} />
                  </div>
                  <p className="text-[11.5px] text-night-muted mt-0.5">
                    {b.legal_form ?? "—"} ·{" "}
                    {b.siret
                      ? `SIRET ${b.siret}`
                      : "SIRET non renseigné"}
                  </p>
                </div>
                <Link
                  href="/ads-manager/business"
                  className="shrink-0 text-night-muted hover:text-night"
                  aria-label="Gérer l'entreprise"
                >
                  <ChevronRight className="w-[16px] h-[16px]" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* === COMPTES PUBLICITAIRES === */}
      <section className="mb-8">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
            <span className="text-gold-deep">·</span> Comptes publicitaires (
            {accounts.length})
          </h2>
          {hasBusiness ? (
            <Link
              href="/ads-manager/business?action=new-account"
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-gold-deep hover:underline"
            >
              <Plus className="w-[12px] h-[12px]" aria-hidden />
              Nouveau compte pub
            </Link>
          ) : null}
        </div>
        {!hasAccount ? (
          <EmptyAccountsState hasBusiness={hasBusiness} />
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.map((a) => (
              <li key={a.id}>
                <AccountCard account={a} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* === QUICK ACTIONS — outils === */}
      {hasAccount && primaryAccount ? (
        <section className="mb-8">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
            <span className="text-gold-deep">·</span> Outils &amp; raccourcis
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <ToolCard
              href={`/ads-manager/${primaryAccount.id}/campaigns/new?mode=smart`}
              icon={Sparkles}
              title="Smart Campaign"
              description="URL → IA analyse → suggestions copy + audience auto"
              accent
            />
            <ToolCard
              href={`/ads-manager/${primaryAccount.id}/campaigns/new?mode=expert`}
              icon={Settings2}
              title="Mode Expert"
              description="Wizard 5 étapes — contrôle total bid strategies + dayparting"
            />
            <ToolCard
              href={`/ads-manager/${primaryAccount.id}/keyword-planner`}
              icon={KeyRound}
              title="Keyword Planner"
              description="Volumes Google Ads + CPC + intent par keyword"
            />
            <ToolCard
              href="/ads-manager/audiences"
              icon={Users2}
              title="Audiences"
              description="Listes clients · Pixel · Lookalikes · DIVARC segments"
            />
            <ToolCard
              href={`/ads-manager/${primaryAccount.id}/funnel`}
              icon={Filter}
              title="Funnel"
              description="Visualisation entonnoir de conversion"
            />
            <ToolCard
              href={`/ads-manager/${primaryAccount.id}/events`}
              icon={Layers3}
              title="Événements"
              description="Drilldown par event tracké (PageView, Purchase…)"
            />
            <ToolCard
              href={`/ads-manager/${primaryAccount.id}/pixels`}
              icon={Code2}
              title="Pixels"
              description="Snippet + CAPI + Pixel Helper de validation"
            />
            <ToolCard
              href="/ads-manager/campaigns"
              icon={LayoutDashboard}
              title="Toutes les campagnes"
              description="Vue agrégée filtrable + actions bulk"
            />
          </div>
        </section>
      ) : null}

      {/* === CONFORMITÉ === */}
      <section className="mb-4">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> Conformité &amp; transparence
        </h2>
        <div className="rounded-2xl bg-bg-soft border border-line p-5">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px] text-night-soft leading-relaxed">
            <ComplianceItem icon={ShieldCheck}>
              <strong className="text-night">DSA art. 28</strong> · ciblage
              18+ enforced sur toutes les campagnes
            </ComplianceItem>
            <ComplianceItem icon={ShieldCheck}>
              <strong className="text-night">RGPD art. 9</strong> · catégories
              sensibles (santé, religion, politique…) bloquées
            </ComplianceItem>
            <ComplianceItem icon={ShieldCheck}>
              <strong className="text-night">DSA art. 39</strong> · toutes les
              ads ajoutées à la{" "}
              <Link
                href="/legal/ads-library"
                target="_blank"
                className="underline"
              >
                bibliothèque publique
              </Link>
            </ComplianceItem>
            <ComplianceItem icon={ShieldCheck}>
              <strong className="text-night">k-anonymity ≥ 100</strong> ·
              estimation reach refusée si bucket {"<"} 100 users
            </ComplianceItem>
            <ComplianceItem icon={CheckCircle2}>
              Modération texte + image automatique avant diffusion
            </ComplianceItem>
            <ComplianceItem icon={CheckCircle2}>
              Anti-discrimination logement / emploi / crédit (special_ad_category)
            </ComplianceItem>
          </ul>
        </div>
      </section>
    </div>
  );
}

/* ============================================================
 * Sub-components
 * ============================================================ */

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <li className="rounded-2xl bg-white border border-line p-3 flex items-start gap-2.5 min-w-0">
      <span
        aria-hidden
        className="w-9 h-9 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
      >
        <Icon className="w-[15px] h-[15px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-night-muted font-bold">
          {label}
        </p>
        <p className="text-[16px] font-bold text-night leading-tight truncate">
          {value}
        </p>
      </div>
    </li>
  );
}

type AccountListItem = Awaited<ReturnType<typeof listMyAdAccounts>>[number];

function AccountCard({ account }: { account: AccountListItem }) {
  return (
    <Link
      href={`/ads-manager/${account.id}`}
      className="group block rounded-2xl bg-white border border-line p-4 hover:border-night/30 hover:shadow-soft transition-all"
    >
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="text-[14.5px] font-bold text-night truncate">
          {account.name}
        </p>
        <StatusBadge status={account.status} />
      </div>
      <p className="text-[11px] text-night-muted truncate">
        {account.business_legal_name ?? "—"}
      </p>
      <div className="mt-3 pt-3 border-t border-line flex items-baseline justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-night-muted font-bold">
            Solde
          </p>
          <p className="text-[15px] font-bold text-night leading-none mt-0.5">
            {Number(account.prepaid_balance).toFixed(2)} {account.currency}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {account.role ? (
            <span className="text-[10px] uppercase tracking-wider font-bold text-night-muted bg-bg-soft px-1.5 py-0.5 rounded">
              {labelRole(account.role)}
            </span>
          ) : null}
          <ArrowRight
            className="w-[14px] h-[14px] text-night-muted group-hover:text-night transition-colors"
            aria-hidden
          />
        </div>
      </div>
    </Link>
  );
}

function ToolCard({
  href,
  icon: Icon,
  title,
  description,
  accent,
}: {
  href: string;
  icon: typeof BarChart3;
  title: string;
  description: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-2xl border p-4 transition-all ${
        accent
          ? "bg-gold/10 border-gold-deep/30 hover:bg-gold/20"
          : "bg-white border-line hover:border-night/30 hover:shadow-soft"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            accent
              ? "bg-gold-deep text-cream"
              : "bg-gold/15 text-gold-deep"
          }`}
        >
          <Icon className="w-[18px] h-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-night flex items-center gap-1">
            {title}
            {accent ? (
              <Sparkles
                className="w-[11px] h-[11px] text-gold-deep"
                aria-hidden
              />
            ) : null}
          </p>
          <p className="text-[11.5px] text-night-muted leading-snug mt-0.5">
            {description}
          </p>
        </div>
        <ArrowRight
          className="w-[14px] h-[14px] text-night-muted group-hover:text-night transition-colors shrink-0"
          aria-hidden
        />
      </div>
    </Link>
  );
}

function ComplianceItem({
  icon: Icon,
  children,
}: {
  icon: typeof ShieldCheck;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2">
      <Icon
        className="w-[14px] h-[14px] text-emerald-700 mt-0.5 shrink-0"
        aria-hidden
      />
      <span>{children}</span>
    </li>
  );
}

function NewBusinessCTA() {
  return (
    <section className="mb-8">
      <div className="rounded-2xl bg-gradient-to-br from-gold/15 to-bg-soft border border-line p-5 sm:p-6">
        <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
          <span
            aria-hidden
            className="w-12 h-12 rounded-2xl bg-gold-deep text-cream flex items-center justify-center shrink-0"
          >
            <Building2 className="w-6 h-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold text-night">
              Première étape : crée ton compte entreprise
            </h2>
            <p className="text-[13px] text-night-soft mt-1.5 leading-relaxed">
              Avant de lancer une campagne, on a besoin de ta raison sociale
              (SIRET, TVA, adresse de facturation). 2 min suffisent. Le KYB
              complet (K-bis + pièce d&apos;identité) n&apos;est requis
              qu&apos;à partir de 5 000 €/mois de dépense.
            </p>
            <Link
              href="/ads-manager/business"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full bg-night text-cream text-[13px] font-bold hover:bg-night/90"
            >
              <Plus className="w-[14px] h-[14px]" aria-hidden />
              Créer mon entreprise
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyAccountsState({ hasBusiness }: { hasBusiness: boolean }) {
  return (
    <div className="rounded-2xl bg-white border-2 border-dashed border-line p-8 text-center">
      <span
        aria-hidden
        className="mx-auto w-14 h-14 rounded-2xl bg-gold/15 text-gold-deep flex items-center justify-center mb-3"
      >
        <LayoutDashboard className="w-7 h-7" aria-hidden />
      </span>
      <p className="text-[15px] font-bold text-night mb-1">
        Aucun compte publicitaire
      </p>
      <p className="text-[12.5px] text-night-muted max-w-md mx-auto leading-relaxed">
        {hasBusiness
          ? "Crée ton premier compte publicitaire depuis ta page entreprise pour commencer à diffuser des campagnes."
          : "Crée d'abord ton compte entreprise ci-dessus, puis ouvre ton premier compte pub."}
      </p>
      {hasBusiness ? (
        <Link
          href="/ads-manager/business?action=new-account"
          className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full bg-night text-cream text-[12.5px] font-bold hover:bg-night/90"
        >
          <Plus className="w-[12px] h-[12px]" aria-hidden />
          Créer mon premier compte pub
        </Link>
      ) : null}
    </div>
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
      className={`text-[9.5px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border shrink-0 ${
        map[status] ?? map.closed
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function VerificationBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    pending: {
      cls: "bg-night-muted/10 text-night-muted border-line",
      label: "À vérifier",
    },
    submitted: {
      cls: "bg-blue-50 text-blue-700 border-blue-200",
      label: "En cours",
    },
    verified: {
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      label: "Vérifié",
    },
    rejected: {
      cls: "bg-red-50 text-red-700 border-red-200",
      label: "Rejeté",
    },
  };
  const v = map[status] ?? map.pending;
  if (!v) return null;
  return (
    <span
      className={`text-[9.5px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border shrink-0 ${v.cls}`}
    >
      {v.label}
    </span>
  );
}

function labelRole(r: string): string {
  return (
    {
      admin: "Admin",
      editor: "Éditeur",
      analyst: "Analyste",
      finance: "Finance",
    }[r] ?? r
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} k`;
  return String(n);
}
