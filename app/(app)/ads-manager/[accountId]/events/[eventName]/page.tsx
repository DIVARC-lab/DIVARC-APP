import { ArrowLeft, ChevronRight, Target, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { getEventDrilldown } from "@/lib/queries/adsEvents";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Détail événement" };

type Params = Promise<{ accountId: string; eventName: string }>;
type SearchParams = Promise<{ period?: string }>;

export default async function EventDrilldownPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { accountId, eventName } = await params;
  const { period } = await searchParams;
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

  const decoded = decodeURIComponent(eventName);
  const days = period === "7" ? 7 : period === "90" ? 90 : 30;
  const since = new Date(
    Date.now() - days * 24 * 3600 * 1000,
  ).toISOString();

  const drilldown = await getEventDrilldown({
    ad_account_id: accountId,
    event_name: decoded,
    since,
  });

  const maxDailyCount = Math.max(
    1,
    ...drilldown.daily_trend.map((d) => d.count),
  );

  return (
    <div className="px-5 sm:px-8 py-8 max-w-5xl mx-auto">
      <Link
        href={`/ads-manager/${accountId}/events${period ? `?period=${period}` : ""}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
      >
        <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
        Tous les événements
      </Link>

      <header className="mb-7">
        <KickerLabel>· Événement · {days} jours</KickerLabel>
        <DisplayHeading
          size="lg"
          className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
        >
          {decoded}
        </DisplayHeading>
        <div className="mt-3 flex items-center gap-3 flex-wrap text-[13px]">
          <Stat
            label="Total"
            value={drilldown.total_count.toLocaleString("fr-FR")}
          />
          <Stat
            label="Attribués"
            value={drilldown.attributed_count.toLocaleString("fr-FR")}
          />
          <Stat
            label="Taux attribution"
            value={
              drilldown.total_count > 0
                ? `${((drilldown.attributed_count / drilldown.total_count) * 100).toFixed(1)} %`
                : "—"
            }
          />
        </div>
      </header>

      {/* Daily trend */}
      <section className="mb-8">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> Tendance quotidienne
        </h2>
        {drilldown.daily_trend.length === 0 ? (
          <p className="rounded-2xl bg-white border border-line p-5 text-[13px] text-night-muted text-center">
            Aucun événement sur la période.
          </p>
        ) : (
          <div className="rounded-2xl bg-white border border-line p-5">
            <div className="flex items-end gap-1 h-32">
              {drilldown.daily_trend.map((d) => {
                const heightPct = (d.count / maxDailyCount) * 100;
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center gap-1 group"
                    title={`${d.date} : ${d.count} events ${d.value > 0 ? `· ${d.value.toFixed(2)}€` : ""}`}
                  >
                    <span className="text-[9px] text-night-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.count}
                    </span>
                    <div className="w-full flex flex-col-reverse">
                      <div
                        className="w-full bg-night rounded-t-sm hover:bg-gold-deep transition-colors"
                        style={{ minHeight: "2px", height: `${heightPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-night-muted">
              <span>{drilldown.daily_trend[0]?.date}</span>
              <span>{drilldown.daily_trend[drilldown.daily_trend.length - 1]?.date}</span>
            </div>
          </div>
        )}
      </section>

      {/* Attribution models */}
      {Object.keys(drilldown.attribution_models).length > 0 ? (
        <section className="mb-8">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
            <span className="text-gold-deep">·</span> Modèles d&apos;attribution
            utilisés
          </h2>
          <div className="rounded-2xl bg-white border border-line p-5">
            <ul className="space-y-2">
              {Object.entries(drilldown.attribution_models)
                .sort(([, a], [, b]) => b - a)
                .map(([model, count]) => {
                  const pct =
                    drilldown.attributed_count > 0
                      ? (count / drilldown.attributed_count) * 100
                      : 0;
                  return (
                    <li key={model}>
                      <div className="flex items-baseline justify-between gap-3 mb-1">
                        <span className="text-[12.5px] font-semibold text-night">
                          {labelModel(model)}
                        </span>
                        <span className="text-[11.5px] text-night-muted">
                          {count} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-soft overflow-hidden">
                        <div
                          className="h-full bg-night-soft"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Top ads attribuées */}
      <section>
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> Top 10 publicités
          attribuées
        </h2>
        {drilldown.top_ads.length === 0 ? (
          <div className="rounded-2xl bg-white border border-line p-5 text-center">
            <p className="text-[13px] text-night-muted">
              Aucune attribution encore. Le cron ads-attribution s&apos;exécute
              toutes les 10 minutes.
            </p>
          </div>
        ) : (
          <ul className="rounded-2xl bg-white border border-line overflow-hidden divide-y divide-line">
            {drilldown.top_ads.map((ad, idx) => (
              <li
                key={ad.ad_id}
                className="px-4 py-3 flex items-center gap-3"
              >
                <span
                  aria-hidden
                  className="w-7 h-7 rounded-full bg-gold/15 text-gold-deep flex items-center justify-center text-[11px] font-bold shrink-0"
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-night truncate">
                    {ad.ad_name}
                  </p>
                  <p className="text-[11px] text-night-muted">
                    Campagne : {ad.campaign_name}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-right shrink-0">
                  <div>
                    <p className="text-[10.5px] uppercase tracking-wider text-night-muted font-bold">
                      Events
                    </p>
                    <p className="text-[14px] font-bold text-night">
                      {ad.event_count}
                    </p>
                  </div>
                  {ad.total_value > 0 ? (
                    <div>
                      <p className="text-[10.5px] uppercase tracking-wider text-night-muted font-bold">
                        Valeur
                      </p>
                      <p className="text-[14px] font-bold text-emerald-700">
                        {ad.total_value.toFixed(2)} €
                      </p>
                    </div>
                  ) : null}
                  <div className="hidden sm:block">
                    <p className="text-[10.5px] uppercase tracking-wider text-night-muted font-bold flex items-center gap-1 justify-end">
                      <Users className="w-3 h-3" aria-hidden />
                      Users
                    </p>
                    <p className="text-[12px] text-night">{ad.unique_users}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <div className="rounded-2xl bg-bg-soft border border-line p-4 text-[12px] text-night-soft leading-relaxed">
          <p className="font-semibold text-night mb-1.5 flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-gold-deep" aria-hidden />
            À propos de l&apos;attribution
          </p>
          <p>
            Le modèle d&apos;attribution est configurable via la variable
            d&apos;env <code>ADS_ATTRIBUTION_MODEL_DEFAULT</code> (last_click
            par défaut). Les conversions non-attribuées sont des events
            reçus sans clic préalable trackable dans la fenêtre
            d&apos;attribution (<code>ADS_ATTRIBUTION_WINDOW</code>, défaut
            7 jours).
          </p>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-night-muted font-bold">
        {label}
      </p>
      <p className="text-[18px] font-bold text-night leading-none">{value}</p>
    </div>
  );
}

function labelModel(model: string): string {
  return (
    {
      last_click: "Last-click (défaut)",
      first_click: "First-click",
      linear: "Linéaire",
      time_decay: "Time decay (demi-vie 7j)",
      position_based: "Position-based (40-40-20)",
      view_through: "View-through",
    }[model] ?? model
  );
}
