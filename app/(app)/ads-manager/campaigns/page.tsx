import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { listMyAdAccounts } from "@/lib/queries/ads";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Toutes mes campagnes" };

/* /ads-manager/campaigns — vue agrégée de toutes les campagnes sur tous
 * les ad_accounts du user (cross-account). Utile pour avoir une vue
 * d'ensemble rapide sans avoir à drill-down par ad_account.
 */
export default async function AllCampaignsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accounts = await listMyAdAccounts();
  const accountIds = accounts.map((a) => a.id);

  let campaigns: Array<{
    id: string;
    name: string;
    status: string;
    objective: string;
    daily_budget: number | null;
    lifetime_budget: number | null;
    ad_account_id: string;
    created_at: string;
  }> = [];

  if (accountIds.length > 0) {
    const { data, error } = await supabase
      .from("ads_campaigns")
      .select(
        "id, name, status, objective, daily_budget, lifetime_budget, ad_account_id, created_at",
      )
      .in("ad_account_id", accountIds)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error && error.code !== "42P01") {
      console.error("[ads:campaigns:list]", error);
    }
    campaigns = data ?? [];
  }

  /* Map ad_account_id → nom pour affichage. */
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  return (
    <div className="px-5 sm:px-8 py-8 max-w-6xl mx-auto">
      <header className="mb-7 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <KickerLabel>· Toutes mes campagnes</KickerLabel>
          <DisplayHeading
            size="lg"
            className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
          >
            Tes <em className="italic text-gold-deep">campagnes</em>
          </DisplayHeading>
          <p className="mt-2 text-[13px] text-night-muted">
            Vue cross-comptes : toutes les campagnes de tous tes ad_accounts.
          </p>
        </div>
        {accounts.length > 0 ? (
          <Link
            href={`/ads-manager/${accounts[0].id}/campaigns/new`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-night text-cream text-[13px] font-semibold hover:bg-night/90"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Nouvelle campagne
          </Link>
        ) : null}
      </header>

      {accounts.length === 0 ? (
        <p className="rounded-2xl bg-white border border-line p-6 text-center text-[13px] text-night-muted">
          Pas encore de compte publicitaire.{" "}
          <Link
            href="/ads-manager/business"
            className="text-gold-deep hover:underline font-semibold"
          >
            Crée ton entreprise
          </Link>{" "}
          pour démarrer.
        </p>
      ) : campaigns.length === 0 ? (
        <p className="rounded-2xl bg-white border border-line p-6 text-center text-[13px] text-night-muted">
          Aucune campagne pour l&apos;instant. Lance ta première !
        </p>
      ) : (
        <ul className="rounded-2xl bg-white border border-line overflow-hidden divide-y divide-line">
          {campaigns.map((c) => {
            const account = accountMap.get(c.ad_account_id);
            return (
              <li
                key={c.id}
                className="px-4 py-3 flex items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-[14px] font-semibold text-night truncate">
                      {c.name}
                    </p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-[11.5px] text-night-muted">
                    {account?.name ?? "—"} · {labelObjective(c.objective)} ·{" "}
                    {c.daily_budget
                      ? `${Number(c.daily_budget).toFixed(0)} ${account?.currency ?? "€"}/jour`
                      : c.lifetime_budget
                        ? `${Number(c.lifetime_budget).toFixed(0)} ${account?.currency ?? "€"} total`
                        : "Budget non défini"}
                  </p>
                </div>
                <Link
                  href={`/ads-manager/${c.ad_account_id}`}
                  className="text-[12px] text-gold-deep hover:underline shrink-0"
                >
                  Voir →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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
