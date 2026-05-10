import { BarChart3, MousePointerClick, ShoppingBag, Eye } from "lucide-react";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { listMyAdAccounts } from "@/lib/queries/ads";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const metadata = { title: "Analytics Ads" };

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accounts = await listMyAdAccounts();
  const accountIds = accounts.map((a) => a.id);
  if (accountIds.length === 0) {
    return (
      <div className="px-5 sm:px-8 py-8 max-w-5xl mx-auto">
        <p className="text-[14px] text-night-muted">
          Pas de compte publicitaire. Crée-en un d&apos;abord.
        </p>
      </div>
    );
  }

  /* Stats agrégées par campagne sur 30j. service_role pour pouvoir lire
     ad_impressions/ad_clicks/ad_conversions à grande échelle (les RLS
     limitent à analyst+ mais on a vérifié via listMyAdAccounts). */
  const admin = createAdminClient();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [
    { data: campaigns },
    { count: totalImpressions },
    { count: totalClicks },
    { count: totalConversions },
    { data: spend },
  ] = await Promise.all([
    admin
      .from("ads_campaigns")
      .select("id, name, objective, status, ad_account_id")
      .in("ad_account_id", accountIds),
    admin
      .from("ad_impressions")
      .select("id", { count: "exact", head: true })
      .in("ad_account_id", accountIds)
      .gte("created_at", since),
    admin
      .from("ad_clicks")
      .select("id", { count: "exact", head: true })
      .in("ad_account_id", accountIds)
      .gte("created_at", since)
      .eq("is_invalid", false),
    admin
      .from("ad_conversions")
      .select("id", { count: "exact", head: true })
      .in("ad_account_id", accountIds)
      .gte("created_at", since)
      .eq("is_invalid", false),
    admin
      .from("ads_charges")
      .select("amount")
      .in("ad_account_id", accountIds)
      .eq("type", "spend")
      .gte("created_at", since),
  ]);

  const totalSpend =
    spend?.reduce((acc, s) => acc + Number(s.amount), 0) ?? 0;
  const ctr =
    totalImpressions && totalImpressions > 0
      ? (totalClicks ?? 0) / totalImpressions
      : 0;
  const conversionRate =
    totalClicks && totalClicks > 0
      ? (totalConversions ?? 0) / totalClicks
      : 0;
  const cpc =
    totalClicks && totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpm =
    totalImpressions && totalImpressions > 0
      ? (totalSpend / totalImpressions) * 1000
      : 0;

  return (
    <div className="px-5 sm:px-8 py-8 max-w-6xl mx-auto">
      <header className="mb-7">
        <KickerLabel>· Analytics</KickerLabel>
        <DisplayHeading
          size="lg"
          className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
        >
          Performance <em className="italic text-gold-deep">30 jours</em>
        </DisplayHeading>
        <p className="mt-2 text-[13px] text-night-muted">
          Tous comptes confondus. Drill-down par campagne ci-dessous. Export
          CSV/PDF arrive en V2.
        </p>
      </header>

      {/* KPIs. */}
      <section className="mb-8">
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Kpi
            label="Impressions"
            value={formatNumber(totalImpressions ?? 0)}
            icon={Eye}
          />
          <Kpi
            label="Clics"
            value={formatNumber(totalClicks ?? 0)}
            icon={MousePointerClick}
          />
          <Kpi label="CTR" value={`${(ctr * 100).toFixed(2)} %`} icon={BarChart3} />
          <Kpi
            label="Conversions"
            value={formatNumber(totalConversions ?? 0)}
            icon={ShoppingBag}
          />
          <Kpi
            label="CPC moyen"
            value={`${cpc.toFixed(2)} €`}
            icon={BarChart3}
          />
          <Kpi
            label="CPM"
            value={`${cpm.toFixed(2)} €`}
            icon={BarChart3}
          />
        </ul>
        <p className="mt-3 text-[12px] text-night-muted">
          Taux de conversion (clic → conv) :{" "}
          <strong>{(conversionRate * 100).toFixed(2)} %</strong> · Dépense
          totale :{" "}
          <strong>{totalSpend.toFixed(2)} €</strong>
        </p>
      </section>

      {/* Campagnes. */}
      <section>
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> Campagnes
        </h2>
        {!campaigns || campaigns.length === 0 ? (
          <p className="rounded-2xl bg-white border border-line p-5 text-[13px] text-night-muted">
            Aucune campagne.
          </p>
        ) : (
          <ul className="rounded-2xl bg-white border border-line overflow-hidden divide-y divide-line">
            {campaigns.map((c) => (
              <li
                key={c.id}
                className="px-4 py-3 flex items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-night truncate">
                    {c.name}
                  </p>
                  <p className="text-[11.5px] text-night-muted">
                    {c.objective} · {c.status}
                  </p>
                </div>
              </li>
            ))}
          </ul>
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
  icon: typeof BarChart3;
}) {
  return (
    <li className="rounded-2xl bg-white border border-line px-3 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          aria-hidden
          className="w-7 h-7 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
        >
          <Icon className="w-3.5 h-3.5" aria-hidden />
        </span>
        <span className="text-[10px] uppercase tracking-wider text-night-muted truncate">
          {label}
        </span>
      </div>
      <p className="text-[18px] font-bold text-night leading-tight">{value}</p>
    </li>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} k`;
  return n.toString();
}
