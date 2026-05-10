import { ArrowLeft, ChevronRight, Zap } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { listEventReports } from "@/lib/queries/adsEvents";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Reporting events" };

type Params = Promise<{ accountId: string }>;
type SearchParams = Promise<{ period?: string }>;

export default async function EventsReportPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { accountId } = await params;
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

  const days = period === "7" ? 7 : period === "90" ? 90 : 30;
  const since = new Date(
    Date.now() - days * 24 * 3600 * 1000,
  ).toISOString();

  const reports = await listEventReports({
    ad_account_id: accountId,
    since,
  });

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
        <KickerLabel>· Reporting events</KickerLabel>
        <DisplayHeading
          size="lg"
          className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
        >
          Tous tes{" "}
          <em className="italic text-gold-deep">events</em>
        </DisplayHeading>
        <p className="mt-3 text-[14px] text-night-soft max-w-2xl leading-relaxed">
          Vue agrégée par type d&apos;événement (PageView, Purchase, Lead…)
          avec attribution aux campagnes. Clique sur un event pour le
          drilldown : top des ads attribuées, trend quotidien, modèles
          d&apos;attribution utilisés.
        </p>
      </header>

      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <FilterTab
          href={`/ads-manager/${accountId}/events?period=7`}
          label="7 jours"
          active={period === "7"}
        />
        <FilterTab
          href={`/ads-manager/${accountId}/events`}
          label="30 jours"
          active={period !== "7" && period !== "90"}
        />
        <FilterTab
          href={`/ads-manager/${accountId}/events?period=90`}
          label="90 jours"
          active={period === "90"}
        />
      </div>

      {reports.length === 0 ? (
        <div className="rounded-2xl bg-white border border-line p-8 text-center">
          <span
            aria-hidden
            className="mx-auto w-14 h-14 rounded-2xl bg-gold/15 text-gold-deep flex items-center justify-center mb-3"
          >
            <Zap className="w-7 h-7" aria-hidden />
          </span>
          <p className="text-[15px] font-semibold text-night mb-1">
            Aucun événement reçu
          </p>
          <p className="text-[12.5px] text-night-muted max-w-md mx-auto mb-4">
            Installe le DIVARC Pixel sur ton site pour commencer à tracker
            les conversions.
          </p>
          <Link
            href={`/ads-manager/${accountId}/pixels`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-night text-cream text-[12.5px] font-semibold hover:bg-night/90"
          >
            Configurer un pixel
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-line overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-bg-soft border-b border-line">
              <tr>
                <th className="text-left px-4 py-2.5 text-[10.5px] uppercase tracking-wider text-night-muted font-bold">
                  Événement
                </th>
                <th className="text-right px-2 py-2.5 text-[10.5px] uppercase tracking-wider text-night-muted font-bold">
                  Total
                </th>
                <th className="text-right px-2 py-2.5 text-[10.5px] uppercase tracking-wider text-night-muted font-bold">
                  Attribués
                </th>
                <th className="text-right px-2 py-2.5 text-[10.5px] uppercase tracking-wider text-night-muted font-bold hidden md:table-cell">
                  Valeur
                </th>
                <th className="text-left px-2 py-2.5 text-[10.5px] uppercase tracking-wider text-night-muted font-bold hidden lg:table-cell">
                  Source
                </th>
                <th className="text-right px-4 py-2.5 text-[10.5px] uppercase tracking-wider text-night-muted font-bold">
                  {""}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {reports.map((r) => (
                <tr
                  key={r.event_name}
                  className="hover:bg-bg-soft/60 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-night">{r.event_name}</p>
                    <p className="text-[10.5px] text-night-muted mt-0.5">
                      {labelEvent(r.event_name)}
                    </p>
                  </td>
                  <td className="px-2 py-3 text-right font-mono text-night">
                    {r.total_count.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <p className="font-mono text-night">
                      {r.attributed_count.toLocaleString("fr-FR")}
                    </p>
                    {r.attributed_count > 0 ? (
                      <p className="text-[10.5px] text-emerald-700 font-bold">
                        {(r.attributed_rate * 100).toFixed(1)}%
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-3 text-right text-night hidden md:table-cell">
                    {r.total_value > 0
                      ? `${r.total_value.toFixed(2)} €`
                      : "—"}
                  </td>
                  <td className="px-2 py-3 hidden lg:table-cell">
                    <SourcesBar sources={r.by_source} total={r.total_count} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/ads-manager/${accountId}/events/${encodeURIComponent(r.event_name)}${period ? `?period=${period}` : ""}`}
                      className="inline-flex items-center gap-1 text-[12px] text-gold-deep hover:underline"
                    >
                      Détail
                      <ChevronRight className="w-3 h-3" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SourcesBar({
  sources,
  total,
}: {
  sources: { pixel: number; conversions_api: number; both: number };
  total: number;
}) {
  if (total === 0) return null;
  const pixelPct = (sources.pixel / total) * 100;
  const capiPct = (sources.conversions_api / total) * 100;
  const bothPct = (sources.both / total) * 100;
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-24 h-1.5 rounded-full bg-bg-soft overflow-hidden flex">
        <div
          className="h-full bg-blue-500"
          style={{ width: `${pixelPct}%` }}
          title={`Pixel ${sources.pixel}`}
        />
        <div
          className="h-full bg-emerald-500"
          style={{ width: `${capiPct}%` }}
          title={`CAPI ${sources.conversions_api}`}
        />
        <div
          className="h-full bg-violet-500"
          style={{ width: `${bothPct}%` }}
          title={`Both ${sources.both}`}
        />
      </div>
      <span className="text-[10px] text-night-muted">
        {sources.both > 0 ? `${sources.both} dédup` : ""}
      </span>
    </div>
  );
}

function FilterTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
        active
          ? "border-night bg-night text-cream"
          : "border-line bg-white text-night-muted hover:bg-bg-soft"
      }`}
    >
      {label}
    </Link>
  );
}

function labelEvent(name: string): string {
  return (
    {
      PageView: "Vue de page",
      ViewContent: "Vue produit/contenu",
      Search: "Recherche",
      AddToCart: "Ajout au panier",
      AddToWishlist: "Ajout liste de souhaits",
      InitiateCheckout: "Tunnel commande",
      AddPaymentInfo: "Info paiement ajoutée",
      Purchase: "Achat finalisé",
      Lead: "Lead capturé",
      CompleteRegistration: "Inscription complète",
    }[name] ?? "Événement personnalisé"
  );
}
