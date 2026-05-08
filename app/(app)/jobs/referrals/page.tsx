import { ArrowLeft, Inbox, Send, UserPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs } from "@/components/ui/Tabs";
import {
  listReferralsByMe,
  listReferralsForMe,
} from "@/lib/queries/referrals";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils/relativeTime";
import { KickerLabel } from "@/components/ui/KickerLabel";

export const metadata = {
  title: "Mes cooptations",
};

const TABS = [
  { id: "recues", label: "Reçues", icon: Inbox },
  { id: "envoyees", label: "Envoyées", icon: Send },
] as const;

type TabId = (typeof TABS)[number]["id"];
type SearchParams = Promise<{ tab?: string }>;

export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { tab } = await searchParams;
  const activeTab: TabId =
    (TABS.find((t) => t.id === tab)?.id as TabId) ?? "recues";

  const [received, sent] = await Promise.all([
    listReferralsForMe(user.id),
    listReferralsByMe(user.id),
  ]);

  const visibleTabs = TABS.map((t) => ({
    id: t.id,
    label:
      (t.id === "recues" && received.length > 0
        ? `${t.label} · ${received.length}`
        : t.id === "envoyees" && sent.length > 0
          ? `${t.label} · ${sent.length}`
          : t.label),
    icon: t.icon,
  }));

  return (
    <div className="px-6 sm:px-10 py-10 max-w-3xl mx-auto w-full space-y-8">
      <header>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Emploi
        </Link>
        <KickerLabel>Cooptation</KickerLabel>
        <h1 className="mt-2 font-display text-4xl text-night">
          <em className="italic text-gold-deep">Recommandations</em> entre amis.
        </h1>
        <p className="mt-1 text-muted-strong">
          Tes amis te recommandent pour des postes. Tu peux aussi les coopter.
        </p>
      </header>

      <Tabs
        tabs={visibleTabs}
        activeId={activeTab}
        pathname="/jobs/referrals"
        defaultTab="recues"
        paramName="tab"
      />

      {activeTab === "recues" ? (
        received.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Pas encore de cooptation reçue"
            body="Quand un ami te recommandera pour un poste, tu le verras ici."
          />
        ) : (
          <ul className="space-y-3">
            {received.map((r) => (
              <li key={r.id}>
                <ReferralCard referral={r} variant="received" />
              </li>
            ))}
          </ul>
        )
      ) : null}

      {activeTab === "envoyees" ? (
        sent.length === 0 ? (
          <EmptyState
            icon={Send}
            title="Aucune cooptation envoyée"
            body="Trouve une offre intéressante et clique sur « Coopter un ami »."
          />
        ) : (
          <ul className="space-y-3">
            {sent.map((r) => (
              <li key={r.id}>
                <ReferralCard referral={r} variant="sent" />
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

function ReferralCard({
  referral,
  variant,
}: {
  referral: Awaited<ReturnType<typeof listReferralsForMe>>[number];
  variant: "received" | "sent";
}) {
  const counterpart =
    variant === "received" ? referral.referrer : referral.referred;
  const counterpartName =
    counterpart?.full_name ?? counterpart?.username ?? "Membre";

  return (
    <article className="p-5 rounded-2xl bg-white border border-line">
      <div className="flex items-start gap-3">
        <Avatar
          src={counterpart?.avatar_url ?? null}
          fullName={counterpartName}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-night-muted">
            {variant === "received" ? (
              <>
                <strong className="text-night">{counterpartName}</strong> te
                recommande pour
              </>
            ) : (
              <>
                Tu as recommandé{" "}
                <strong className="text-night">{counterpartName}</strong> pour
              </>
            )}
          </p>
          <Link
            href={referral.job ? `/jobs/${referral.job.id}` : "#"}
            className="font-display text-lg text-night hover:underline"
          >
            « {referral.job?.title ?? "Offre supprimée"} »
          </Link>
          {referral.job?.company_name ? (
            <p className="text-xs text-muted">
              chez {referral.job.company_name}
            </p>
          ) : null}
          {referral.message ? (
            <blockquote className="mt-3 p-3 rounded-2xl bg-night/[0.03] border border-line text-sm text-night-muted leading-relaxed">
              « {referral.message} »
            </blockquote>
          ) : null}
          <div className="mt-3 flex items-center gap-3 text-[11px] text-muted">
            <span>{formatRelative(referral.created_at)}</span>
            {referral.application_id ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                Candidature envoyée ✓
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/15 text-gold-deep font-semibold">
                En attente
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Inbox;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center py-16 px-6 rounded-3xl bg-white border border-line">
      <div
        aria-hidden
        className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5"
      >
        <Icon className="w-7 h-7 text-gold-deep" aria-hidden />
      </div>
      <h2 className="font-display text-2xl text-night">{title}</h2>
      <p className="mt-2 text-muted max-w-sm mx-auto">{body}</p>
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 mt-6 px-4 h-10 rounded-full bg-night text-cream text-sm font-semibold hover:bg-night-soft"
      >
        <UserPlus className="w-4 h-4" aria-hidden />
        Voir les offres
      </Link>
    </div>
  );
}
