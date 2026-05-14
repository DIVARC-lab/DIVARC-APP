import { Plus, Target, Users2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { listMyAdAccounts } from "@/lib/queries/ads";
import { createClient } from "@/lib/supabase/server";
import { Container } from "@/components/primitives/Container";

export const metadata = { title: "Audiences" };

export default async function AudiencesManagerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accounts = await listMyAdAccounts();
  const accountIds = accounts.map((a) => a.id);

  /* Liste toutes les audiences sur les ad_accounts du user. Defensive
     fallback si la migration 0048 n'est pas appliquée. */
  let audiences: Array<{
    id: string;
    name: string;
    type: string;
    estimated_size: number | null;
    custom_match_rate: number | null;
  }> = [];
  if (accountIds.length > 0) {
    const { data, error } = await supabase
      .from("ads_audiences")
      .select("id, name, type, estimated_size, custom_match_rate")
      .in("ad_account_id", accountIds)
      .order("created_at", { ascending: false });
    if (error && error.code !== "42P01") {
      console.error("[ads:audiences:list]", error);
    }
    audiences = data ?? [];
  }

  return (
    <Container maxWidth="wide" paddingX="page" paddingY="3xl">
      <header className="mb-7 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <KickerLabel>· Audiences</KickerLabel>
          <DisplayHeading
            size="lg"
            className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
          >
            Tes <em className="italic text-gold-deep">audiences</em>
          </DisplayHeading>
          <p className="mt-3 text-[14px] text-night-soft max-w-2xl leading-relaxed">
            Crée des audiences réutilisables (saved), uploade tes listes
            clients (custom hashées SHA-256), génère des audiences similaires
            (lookalike) ou exploite les segments DIVARC spéciaux.
          </p>
        </div>
        {accounts.length > 0 ? (
          <Link
            href={`/ads-manager/audiences/new?account=${accounts[0].id}`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-night text-cream text-[13px] font-semibold hover:bg-night/90"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Nouvelle audience
          </Link>
        ) : null}
      </header>

      {audiences.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {audiences.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl bg-white border border-line p-4"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="w-9 h-9 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
                >
                  {a.type === "custom_list" ? (
                    <Users2 className="w-4 h-4" aria-hidden />
                  ) : (
                    <Target className="w-4 h-4" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-night truncate">
                    {a.name}
                  </p>
                  <p className="text-[11px] uppercase tracking-wider text-night-muted">
                    {labelType(a.type)}
                  </p>
                  {a.estimated_size ? (
                    <p className="text-[12px] text-night-soft mt-1">
                      ~{formatNumber(a.estimated_size)} users
                    </p>
                  ) : null}
                  {a.type === "custom_list" && a.custom_match_rate ? (
                    <p className="text-[11px] text-night-muted mt-1">
                      Match rate :{" "}
                      {(a.custom_match_rate * 100).toFixed(1)} %
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl bg-white border border-line p-8 text-center">
      <p className="text-[14px] text-night font-semibold mb-1.5">
        Aucune audience créée
      </p>
      <p className="text-[12.5px] text-night-muted max-w-md mx-auto leading-relaxed">
        Tu peux soit créer des audiences depuis le wizard de campagne (saved
        à la volée), soit en créer ici à l&apos;avance pour les réutiliser.
      </p>
    </div>
  );
}

function labelType(t: string): string {
  return (
    {
      saved: "Audience sauvegardée",
      custom_list: "Liste clients (CSV)",
      custom_pixel: "Trafic site (Pixel)",
      custom_engagement: "Engagement DIVARC",
      lookalike: "Audience similaire",
      divarc_special: "Segment DIVARC",
    }[t] ?? t
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k`;
  return n.toString();
}
