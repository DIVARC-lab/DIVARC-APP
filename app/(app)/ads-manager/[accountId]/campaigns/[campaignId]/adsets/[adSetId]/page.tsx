import {
  ArrowLeft,
  Eye,
  Image as ImageIcon,
  MousePointerClick,
  Plus,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { CreateAdButton } from "./CreateAdButton";

export const metadata = { title: "Détail AdSet" };

type Params = Promise<{
  accountId: string;
  campaignId: string;
  adSetId: string;
}>;

/* /ads-manager/[accountId]/campaigns/[campaignId]/adsets/[adSetId]
 *
 * Détail d'un AdSet avec :
 *   - Récap audience + budget + placements + opti
 *   - 4 KPIs 30j
 *   - Liste des Ads (multi-creative pour A/B test) avec stats par Ad
 *   - Bouton "Créer une Ad supplémentaire" (modal)
 */
export default async function AdSetDetailPage({
  params,
}: {
  params: Params;
}) {
  const { accountId, campaignId, adSetId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: accountId,
    p_min_role: "analyst",
  });
  if (!hasRole) notFound();

  const { data: adSet } = await supabase
    .from("ads_ad_sets")
    .select("*")
    .eq("id", adSetId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (!adSet) notFound();

  const { data: campaign } = await supabase
    .from("ads_campaigns")
    .select("name, objective")
    .eq("id", campaignId)
    .maybeSingle();

  /* Liste des Ads avec leurs creatives. */
  const { data: ads } = await supabase
    .from("ads_ads")
    .select("*")
    .eq("ad_set_id", adSetId)
    .order("created_at", { ascending: false });

  const creativeIds = (ads ?? []).map((a) => a.creative_id);
  const { data: creatives } = creativeIds.length > 0
    ? await supabase
        .from("ads_creatives")
        .select(
          "id, primary_text, headline, description, media_url, call_to_action, advertiser_entity_id, auto_disclaimer",
        )
        .in("id", creativeIds)
    : { data: [] };
  const creativeMap = new Map((creatives ?? []).map((c) => [c.id, c]));

  /* Stats 30j de l'AdSet. */
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const admin = createAdminClient();
  const [{ count: imp }, { count: clk }, { data: spendRows }] = await Promise.all(
    [
      admin
        .from("ad_impressions")
        .select("id", { count: "exact", head: true })
        .eq("ad_set_id", adSetId)
        .gte("created_at", since),
      admin
        .from("ad_clicks")
        .select("id", { count: "exact", head: true })
        .eq("ad_set_id", adSetId)
        .eq("is_invalid", false)
        .gte("created_at", since),
      admin
        .from("ad_impressions")
        .select("charged_amount")
        .eq("ad_set_id", adSetId)
        .gte("created_at", since),
    ],
  );
  const totalImp = imp ?? 0;
  const totalClk = clk ?? 0;
  const totalSpend =
    spendRows?.reduce(
      (acc, r) => acc + Number(r.charged_amount ?? 0),
      0,
    ) ?? 0;
  const ctr = totalImp > 0 ? totalClk / totalImp : 0;
  const cpc = totalClk > 0 ? totalSpend / totalClk : 0;

  /* Récup les advertiser_entities pour le bouton CreateAd. */
  const { data: entities } = await supabase
    .from("advertiser_entities")
    .select("id, name, type")
    .eq("ad_account_id", accountId);

  const targeting = adSet.targeting as {
    age_min?: number;
    age_max?: number;
    genders?: string[];
    geo?: { countries?: string[] };
    interests?: Array<{ topic_id: string }>;
  };

  return (
    <div className="px-5 sm:px-8 py-8 max-w-6xl mx-auto">
      <Link
        href={`/ads-manager/${accountId}/campaigns/${campaignId}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
      >
        <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
        {campaign?.name ?? "Campagne"}
      </Link>

      <header className="mb-7">
        <KickerLabel>· Ensemble de publicités</KickerLabel>
        <div className="flex items-end justify-between gap-4 flex-wrap mt-2">
          <div>
            <DisplayHeading
              size="lg"
              className="!leading-[1.05] !text-[32px] sm:!text-[40px]"
            >
              {adSet.name}
            </DisplayHeading>
            <div className="mt-2 flex items-center gap-2.5 flex-wrap text-[12px]">
              <AdSetStatusBadge status={adSet.status} />
              <span className="text-night-muted">·</span>
              <span className="text-night-muted">
                {(ads?.length ?? 0)} ad{(ads?.length ?? 0) > 1 ? "s" : ""} dans
                cet AdSet
              </span>
            </div>
          </div>
          <CreateAdButton
            adSetId={adSetId}
            entities={entities ?? []}
          />
        </div>
      </header>

      {/* Récap audience + budget + placements + opti */}
      <section className="mb-8">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> Configuration
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ConfigCard title="Audience">
            <p className="text-[13px] text-night">
              {targeting?.age_min ?? 18}-{targeting?.age_max ?? 65} ans ·{" "}
              {targeting?.genders?.join(", ") ?? "Tous"}
            </p>
            <p className="text-[12px] text-night-muted mt-1">
              {targeting?.geo?.countries?.join(", ") ?? "FR"}
            </p>
            {targeting?.interests && targeting.interests.length > 0 ? (
              <p className="text-[11px] text-night-muted mt-1">
                Intérêts :{" "}
                {targeting.interests
                  .slice(0, 3)
                  .map((i) => i.topic_id)
                  .join(", ")}
                {targeting.interests.length > 3 ? "…" : ""}
              </p>
            ) : null}
          </ConfigCard>
          <ConfigCard title="Budget &amp; calendrier">
            <p className="text-[13px] text-night">
              {adSet.daily_budget
                ? `${Number(adSet.daily_budget).toFixed(0)} € / jour`
                : adSet.lifetime_budget
                  ? `${Number(adSet.lifetime_budget).toFixed(0)} € total`
                  : "Budget non défini"}
            </p>
            <p className="text-[12px] text-night-muted mt-1">
              Stratégie : {adSet.bid_strategy} · Pacing : {adSet.pacing_type}
            </p>
            {adSet.start_time || adSet.end_time ? (
              <p className="text-[11px] text-night-muted mt-1">
                {adSet.start_time
                  ? new Date(adSet.start_time).toLocaleDateString("fr-FR")
                  : "—"}{" "}
                →{" "}
                {adSet.end_time
                  ? new Date(adSet.end_time).toLocaleDateString("fr-FR")
                  : "indéfini"}
              </p>
            ) : null}
          </ConfigCard>
          <ConfigCard title="Placements">
            <p className="text-[13px] text-night">
              {adSet.placements.join(", ")}
            </p>
          </ConfigCard>
          <ConfigCard title="Optimisation">
            <p className="text-[13px] text-night">
              {adSet.optimization_goal} · {adSet.billing_event}
            </p>
            {adSet.frequency_cap ? (
              <p className="text-[12px] text-night-muted mt-1">
                Freq cap :{" "}
                {(adSet.frequency_cap as { max_impressions?: number }).max_impressions}{" "}
                / {(adSet.frequency_cap as { period_days?: number }).period_days}{" "}
                j
              </p>
            ) : null}
          </ConfigCard>
        </div>
      </section>

      {/* KPIs 30j */}
      <section className="mb-8">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> Performance 30 jours
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label="Impressions" value={formatN(totalImp)} icon={Eye} />
          <Kpi label="Clics" value={formatN(totalClk)} icon={MousePointerClick} />
          <Kpi
            label="CTR"
            value={`${(ctr * 100).toFixed(2)} %`}
            icon={TrendingUp}
          />
          <Kpi label="CPC moyen" value={`${cpc.toFixed(2)} €`} icon={TrendingUp} />
        </div>
        <p className="mt-2 text-[11.5px] text-night-muted">
          Dépense totale : <strong>{totalSpend.toFixed(2)} €</strong>
        </p>
      </section>

      {/* Liste des Ads */}
      <section>
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> Publicités ({ads?.length ?? 0})
        </h2>
        {(ads?.length ?? 0) === 0 ? (
          <div className="rounded-2xl bg-white border border-line p-6 text-center">
            <p className="text-[13px] text-night-muted">
              Cet AdSet n&apos;a pas encore de publicité.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {ads!.map((ad) => {
              const creative = creativeMap.get(ad.creative_id);
              return (
                <li
                  key={ad.id}
                  className="rounded-2xl bg-white border border-line overflow-hidden"
                >
                  <div className="flex items-stretch">
                    {/* Thumbnail */}
                    <div className="w-32 sm:w-44 shrink-0 bg-bg-soft flex items-center justify-center">
                      {creative?.media_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={creative.media_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon
                          className="w-8 h-8 text-night-muted"
                          aria-hidden
                        />
                      )}
                    </div>
                    {/* Body */}
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
                        <p className="text-[14px] font-semibold text-night truncate">
                          {ad.name}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <ReviewStatusBadge status={ad.review_status} />
                          <AdStatusBadge status={ad.status} />
                        </div>
                      </div>
                      {creative ? (
                        <>
                          <p className="text-[12.5px] text-night-soft mt-1 line-clamp-2">
                            {creative.primary_text}
                          </p>
                          <p className="text-[12px] text-night font-semibold mt-1.5 truncate">
                            {creative.headline}
                          </p>
                        </>
                      ) : null}
                      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                        <Stat label="Impr." value={formatN(ad.total_impressions)} />
                        <Stat label="Clics" value={formatN(ad.total_clicks)} />
                        <Stat
                          label="Quality"
                          value={`${Number(ad.quality_score).toFixed(1)}/10`}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function ConfigCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border border-line p-4">
      <p className="text-[10.5px] uppercase tracking-wider font-bold text-night-muted mb-1.5">
        {title}
      </p>
      {children}
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
    <div className="rounded-2xl bg-white border border-line p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          aria-hidden
          className="w-7 h-7 rounded-lg bg-gold/15 text-gold-deep flex items-center justify-center"
        >
          <Icon className="w-3.5 h-3.5" aria-hidden />
        </span>
        <span className="text-[10px] uppercase tracking-wider text-night-muted font-bold">
          {label}
        </span>
      </div>
      <p className="text-[20px] font-bold text-night leading-tight">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] uppercase tracking-wider text-night-muted font-bold">
        {label}
      </p>
      <p className="text-[12px] font-semibold text-night">{value}</p>
    </div>
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

function AdStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    paused: "bg-blue-50 text-blue-700",
    archived: "bg-night-muted/10 text-night-muted",
    rejected: "bg-red-50 text-red-700",
  };
  const labels: Record<string, string> = {
    active: "Active",
    paused: "Pause",
    archived: "Archivée",
    rejected: "Rejetée",
  };
  return (
    <span
      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
        map[status] ?? map.archived
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function ReviewStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-800 border-amber-200",
    auto_approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    limited: "bg-amber-50 text-amber-800 border-amber-200",
    re_review: "bg-amber-50 text-amber-800 border-amber-200",
  };
  const labels: Record<string, string> = {
    pending: "Revue en cours",
    auto_approved: "Auto-OK",
    approved: "Approuvée",
    rejected: "Rejetée",
    limited: "Limitée",
    re_review: "Re-revue",
  };
  return (
    <span
      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${
        map[status] ?? map.pending
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
