import {
  ArrowLeft,
  BarChart3,
  Eye,
  Layers,
  MousePointerClick,
  Plus,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { OBJECTIVE_BY_ID } from "@/components/ads/builder/objectives";
import { createClient } from "@/lib/supabase/server";
import { CampaignActions } from "../../_components/CampaignActions";

export const metadata = { title: "Détail campagne" };

type Params = Promise<{ accountId: string; campaignId: string }>;

/* /ads-manager/[accountId]/campaigns/[campaignId] — page de détail
 * d'une campagne avec gestion multi-AdSets style Meta Business Manager.
 *
 * Layout :
 *   - Header : nom + status + objectif + boutons Pause/Play
 *   - 4 KPIs 30 jours (impressions, clics, CTR, CPC)
 *   - Tableau AdSets avec stats + actions (créer, dupliquer, archiver)
 *   - Pour chaque AdSet : drilldown vers liste des Ads
 */
export default async function CampaignDetailPage({
  params,
}: {
  params: Params;
}) {
  const { accountId, campaignId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  /* Récup campagne. */
  const { data: campaign } = await supabase
    .from("ads_campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("ad_account_id", accountId)
    .maybeSingle();
  if (!campaign) notFound();

  /* Récup ad_sets de la campagne. */
  const { data: adSets } = await supabase
    .from("ads_ad_sets")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  /* Récup ads count par ad_set. */
  const adSetIds = (adSets ?? []).map((s) => s.id);
  const adsCountMap = new Map<string, number>();
  if (adSetIds.length > 0) {
    const { data: ads } = await supabase
      .from("ads_ads")
      .select("ad_set_id")
      .in("ad_set_id", adSetIds);
    for (const a of ads ?? []) {
      adsCountMap.set(a.ad_set_id, (adsCountMap.get(a.ad_set_id) ?? 0) + 1);
    }
  }

  /* Stats agrégées 30j. */
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const [{ count: imp }, { count: clk }, { data: spendRows }] = await Promise.all(
    [
      supabase
        .from("ad_impressions")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .gte("created_at", since),
      supabase
        .from("ad_clicks")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("is_invalid", false)
        .gte("created_at", since),
      supabase
        .from("ad_impressions")
        .select("charged_amount")
        .eq("campaign_id", campaignId)
        .gte("created_at", since),
    ],
  );
  const totalImpressions = imp ?? 0;
  const totalClicks = clk ?? 0;
  const totalSpend =
    spendRows?.reduce(
      (acc, r) => acc + Number(r.charged_amount ?? 0),
      0,
    ) ?? 0;
  const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

  const objectiveDef = OBJECTIVE_BY_ID[campaign.objective];

  return (
    <div className="px-5 sm:px-8 py-8 max-w-6xl mx-auto">
      <Link
        href={`/ads-manager/${accountId}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
      >
        <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
        Compte publicitaire
      </Link>

      <header className="mb-7">
        <KickerLabel>· {objectiveDef?.label ?? campaign.objective}</KickerLabel>
        <div className="flex items-end justify-between gap-4 flex-wrap mt-2">
          <div>
            <DisplayHeading
              size="lg"
              className="!leading-[1.05] !text-[32px] sm:!text-[40px]"
            >
              {campaign.name}
            </DisplayHeading>
            <div className="mt-2 flex items-center gap-2.5 flex-wrap text-[12px]">
              <CampaignStatusBadge status={campaign.status} />
              <span className="text-night-muted">·</span>
              <span className="text-night-muted">
                Créée le{" "}
                {new Date(campaign.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              {campaign.special_ad_category ? (
                <>
                  <span className="text-night-muted">·</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] uppercase tracking-wider font-bold">
                    Cat. spéciale {campaign.special_ad_category}
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <CampaignActions
            campaignId={campaign.id}
            adAccountId={accountId}
            status={campaign.status}
          />
        </div>
      </header>

      {/* KPIs 30j */}
      <section className="mb-8">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> Performance 30 jours
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label="Impressions" value={formatN(totalImpressions)} icon={Eye} />
          <Kpi label="Clics" value={formatN(totalClicks)} icon={MousePointerClick} />
          <Kpi label="CTR" value={`${(ctr * 100).toFixed(2)} %`} icon={TrendingUp} />
          <Kpi label="Dépense" value={`${totalSpend.toFixed(2)} €`} icon={BarChart3} />
        </div>
        {totalClicks > 0 ? (
          <p className="mt-2 text-[11.5px] text-night-muted">
            CPC moyen : <strong>{cpc.toFixed(2)} €</strong>
          </p>
        ) : null}
      </section>

      {/* AdSets */}
      <section>
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
          <div>
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
              <span className="text-gold-deep">·</span> Ensembles de
              publicités ({adSets?.length ?? 0})
            </h2>
            <p className="text-[12px] text-night-muted mt-0.5">
              Un AdSet = une audience + un budget + un placement. Tu peux
              en créer plusieurs pour comparer ce qui marche.
            </p>
          </div>
          <Link
            href={`/ads-manager/${accountId}/campaigns/${campaignId}/adsets/new`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-night text-cream text-[12.5px] font-semibold hover:bg-night/90"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden />
            Nouvel AdSet
          </Link>
        </div>

        {(adSets?.length ?? 0) === 0 ? (
          <div className="rounded-2xl bg-white border border-line p-6 text-center">
            <p className="text-[13px] text-night-muted">
              Cette campagne n&apos;a pas encore d&apos;AdSet.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-line overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-bg-soft border-b border-line">
                <tr>
                  <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-night-muted font-bold">
                    Nom
                  </th>
                  <th className="text-left px-2 py-2.5 text-[11px] uppercase tracking-wider text-night-muted font-bold hidden sm:table-cell">
                    Budget
                  </th>
                  <th className="text-left px-2 py-2.5 text-[11px] uppercase tracking-wider text-night-muted font-bold hidden md:table-cell">
                    Placements
                  </th>
                  <th className="text-right px-2 py-2.5 text-[11px] uppercase tracking-wider text-night-muted font-bold">
                    Impressions
                  </th>
                  <th className="text-right px-2 py-2.5 text-[11px] uppercase tracking-wider text-night-muted font-bold hidden sm:table-cell">
                    Clics
                  </th>
                  <th className="text-right px-2 py-2.5 text-[11px] uppercase tracking-wider text-night-muted font-bold">
                    Ads
                  </th>
                  <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wider text-night-muted font-bold">
                    {""}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {adSets!.map((s) => (
                  <tr key={s.id} className="hover:bg-bg-soft/60 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Layers
                          className="w-3.5 h-3.5 text-night-muted shrink-0"
                          aria-hidden
                        />
                        <p className="font-semibold text-night truncate">
                          {s.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <AdSetStatusBadge status={s.status} />
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-night-soft hidden sm:table-cell">
                      {s.daily_budget
                        ? `${Number(s.daily_budget).toFixed(0)} €/j`
                        : s.lifetime_budget
                          ? `${Number(s.lifetime_budget).toFixed(0)} €`
                          : "—"}
                    </td>
                    <td className="px-2 py-2.5 text-night-muted text-[11.5px] hidden md:table-cell">
                      {s.placements.slice(0, 2).join(", ")}
                      {s.placements.length > 2 ? "…" : ""}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-[12px] text-night">
                      {formatN(s.total_impressions)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-[12px] text-night hidden sm:table-cell">
                      {formatN(s.total_clicks)}
                    </td>
                    <td className="px-2 py-2.5 text-right text-night">
                      {adsCountMap.get(s.id) ?? 0}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/ads-manager/${accountId}/campaigns/${campaignId}/adsets/${s.id}`}
                        className="text-[12px] text-gold-deep hover:underline"
                      >
                        Ouvrir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Eye;
}) {
  return (
    <div className="rounded-2xl bg-white border border-line p-3 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
        <span className="text-[10px] uppercase tracking-wider text-night-muted font-bold truncate">
          {label}
        </span>
        <span
          aria-hidden
          className="w-7 h-7 rounded-lg bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
        >
          <Icon className="w-3.5 h-3.5" aria-hidden />
        </span>
      </div>
      <p className="text-[20px] font-bold text-night leading-tight tabular-nums truncate">
        {value}
      </p>
    </div>
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

function AdSetStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    paused: "bg-blue-50 text-blue-700 border-blue-200",
    archived: "bg-night-muted/10 text-night-muted border-line",
  };
  const labels: Record<string, string> = {
    active: "Actif",
    paused: "En pause",
    archived: "Archivé",
  };
  return (
    <span
      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${
        map[status] ?? map.archived
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function formatN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)} k`;
  return n.toString();
}
