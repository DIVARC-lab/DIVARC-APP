import { BarChart3, Code2, Filter, Plus, Sparkles, TrendingUp, Wand2, Zap } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import {
  getAdAccount,
  getAdAccountStats,
  listCampaigns,
} from "@/lib/queries/ads";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Compte publicitaire" };

type Params = Promise<{ accountId: string }>;

export default async function AdAccountDashboard({
  params,
}: {
  params: Params;
}) {
  const { accountId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const account = await getAdAccount(accountId);
  if (!account) notFound();

  const [stats, campaigns] = await Promise.all([
    getAdAccountStats(accountId),
    listCampaigns(accountId),
  ]);

  return (
    <div className="px-5 sm:px-8 py-8 max-w-6xl mx-auto">
      <Link
        href="/ads-manager"
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
      >
        ← Vue d&apos;ensemble
      </Link>

      <header className="mb-7 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <KickerLabel>· Compte publicitaire</KickerLabel>
          <DisplayHeading
            size="lg"
            className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
          >
            {account.name}
          </DisplayHeading>
          <p className="mt-2 text-[13px] text-night-muted">
            Solde disponible :{" "}
            <strong className="text-night">
              {Number(account.prepaid_balance).toFixed(2)} {account.currency}
            </strong>
            {account.spend_limit_daily ? (
              <>
                {" "}
                · Limite/jour : {Number(account.spend_limit_daily).toFixed(0)}{" "}
                {account.currency}
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/ads-manager/${accountId}/events`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white border border-line text-[13px] font-semibold text-night hover:bg-bg-soft"
          >
            <Zap className="w-4 h-4" aria-hidden />
            Events
          </Link>
          <Link
            href={`/ads-manager/${accountId}/funnel`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white border border-line text-[13px] font-semibold text-night hover:bg-bg-soft"
          >
            <Filter className="w-4 h-4" aria-hidden />
            Funnel
          </Link>
          <Link
            href={`/ads-manager/${accountId}/pixels`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white border border-line text-[13px] font-semibold text-night hover:bg-bg-soft"
          >
            <Code2 className="w-4 h-4" aria-hidden />
            Pixels
          </Link>
          <Link
            href={`/ads-manager/${accountId}/analyzer`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gold/15 border-2 border-gold-deep text-[13px] font-semibold text-gold-deep hover:bg-gold/25"
          >
            <Wand2 className="w-4 h-4" aria-hidden />
            Analyse IA
            <Sparkles className="w-3 h-3" aria-hidden />
          </Link>
          <Link
            href={`/ads-manager/${accountId}/campaigns/new`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-night text-cream text-[13px] font-semibold hover:bg-night/90"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Nouvelle campagne
          </Link>
        </div>
      </header>

      {/* Stats 30 jours. */}
      <section className="mb-8">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> 30 derniers jours
        </h2>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat
            label="Campagnes actives"
            value={stats.active_campaigns}
            icon={TrendingUp}
          />
          <Stat
            label="Dépense"
            value={`${stats.total_spend_30d.toFixed(2)} ${account.currency}`}
            icon={BarChart3}
          />
          <Stat
            label="Impressions"
            value={formatNumber(stats.total_impressions_30d)}
            icon={BarChart3}
          />
          <Stat
            label="CTR"
            value={`${(stats.ctr_30d * 100).toFixed(2)} %`}
            icon={TrendingUp}
          />
        </ul>
      </section>

      {/* Campagnes. */}
      <section className="mb-8">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> Campagnes ({campaigns.length})
        </h2>
        {campaigns.length === 0 ? (
          <div className="rounded-2xl bg-white border border-line p-6 text-center">
            <p className="text-[13px] text-night-muted">
              Aucune campagne. Lance ta première campagne !
            </p>
            <Link
              href={`/ads-manager/${accountId}/campaigns/new`}
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-full bg-night text-cream text-[12px] font-semibold hover:bg-night/90"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden />
              Créer une campagne
            </Link>
          </div>
        ) : (
          <ul className="rounded-2xl bg-white border border-line overflow-hidden divide-y divide-line">
            {campaigns.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/ads-manager/${accountId}/campaigns/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-bg-soft transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-[14px] font-semibold text-night truncate">
                        {c.name}
                      </p>
                      <CampaignStatusBadge status={c.status} />
                    </div>
                    <p className="text-[11.5px] text-night-muted">
                      Objectif {labelObjective(c.objective)} ·{" "}
                      {c.daily_budget
                        ? `${Number(c.daily_budget).toFixed(0)} ${account.currency}/jour`
                        : c.lifetime_budget
                          ? `${Number(c.lifetime_budget).toFixed(0)} ${account.currency} total`
                          : "Budget non défini"}{" "}
                      ·{" "}
                      {labelComplianceStatus(c.compliance_review_status)}
                    </p>
                  </div>
                  <span className="text-[11px] text-night-muted">
                    {new Date(c.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof TrendingUp;
}) {
  return (
    <li className="rounded-2xl bg-white border border-line px-4 py-3 flex items-center gap-3">
      <span
        aria-hidden
        className="w-9 h-9 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
      >
        <Icon className="w-[16px] h-[16px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[10.5px] uppercase tracking-wider text-night-muted">
          {label}
        </p>
        <p className="text-[16px] font-bold text-night leading-tight">
          {value}
        </p>
      </div>
    </li>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-bg-soft text-night-muted border-line",
    pending_review: "bg-amber-50 text-amber-800 border-amber-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    paused: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-night-muted/10 text-night-muted border-line",
    rejected: "bg-red-50 text-red-700 border-red-200",
  };
  const labels: Record<string, string> = {
    draft: "Brouillon",
    pending_review: "En revue",
    active: "Active",
    paused: "En pause",
    completed: "Terminée",
    rejected: "Rejetée",
  };
  return (
    <span
      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${
        map[status] ?? map.draft
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function labelObjective(o: string): string {
  return (
    {
      brand_awareness: "Notoriété",
      reach: "Portée",
      traffic: "Trafic",
      engagement: "Engagement",
      video_views: "Vues vidéo",
      lead_generation: "Lead gen",
      messages: "Messages",
      conversions: "Conversions",
      marketplace_listing_boost: "Boost annonce",
      job_applications: "Candidatures",
      circle_growth: "Croissance cercle",
    }[o] ?? o
  );
}

function labelComplianceStatus(s: string): string {
  return (
    {
      pending: "Conformité en attente",
      approved: "Conformité OK",
      rejected: "Conformité rejetée",
      holding: "Conformité en hold",
    }[s] ?? s
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} k`;
  return n.toString();
}
