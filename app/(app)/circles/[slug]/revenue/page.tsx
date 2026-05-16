/* Sprint C.4 — Dashboard revenus pour le owner d'un cercle premium.
 *
 * KPIs V1 :
 *   - MRR (= prix × abonnés actifs incl. trialing)
 *   - Abonnés actifs (trialing/active/past_due)
 *   - Trial active (subset)
 *   - Cancellations 30j (cancel_at_period_end ou canceled)
 *
 * Liste des 20 abonnements les plus récents avec username + status.
 * V2 : graph MRR par mois, churn rate, ARPU, CAC. */

import {
  ArrowLeft,
  TrendingUp,
  Users,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCircleBySlug } from "@/lib/queries/circles";
import { createClient } from "@/lib/supabase/server";
import type { CircleSubscriptionStatus } from "@/lib/database.types";

type Params = Promise<{ slug: string }>;

export const metadata = { title: "Revenus du cercle" };

const STATUS_LABELS: Record<
  CircleSubscriptionStatus,
  { label: string; color: string }
> = {
  trialing: { label: "Essai", color: "bg-blue-100 text-blue-700" },
  active: { label: "Actif", color: "bg-emerald-100 text-emerald-700" },
  past_due: {
    label: "Retard paiement",
    color: "bg-amber-100 text-amber-700",
  },
  canceled: { label: "Annulé", color: "bg-rose-100 text-rose-700" },
  unpaid: { label: "Impayé", color: "bg-rose-100 text-rose-700" },
  incomplete: { label: "Incomplet", color: "bg-night-dim/15 text-night-dim" },
  incomplete_expired: { label: "Expiré", color: "bg-night-dim/15 text-night-dim" },
  paused: { label: "Pause", color: "bg-night-dim/15 text-night-dim" },
};

export default async function CircleRevenuePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/circles/${slug}/revenue`);

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();

  /* Stricte owner only (les admins n'ont pas accès financier). */
  if (circle.owner_id !== user.id) {
    return (
      <div className="px-5 sm:px-8 py-10 text-center">
        <p className="text-[14px] text-night-dim">
          Seul le propriétaire du cercle peut voir les revenus.
        </p>
        <Link
          href={`/circles/${slug}`}
          className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-gold-deep font-bold hover:underline"
        >
          ← Retour au cercle
        </Link>
      </div>
    );
  }

  if (!circle.is_paid) {
    return (
      <div className="px-5 sm:px-8 py-10 text-center">
        <p className="text-[14px] text-night-dim mb-3">
          Ce cercle n&apos;est pas (encore) monétisé.
        </p>
        <Link
          href={`/circles/${slug}/settings`}
          className="inline-flex items-center h-10 px-4 rounded-full bg-night text-bg text-[12px] font-bold hover:opacity-90 transition-opacity"
        >
          Activer la monétisation →
        </Link>
      </div>
    );
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data: subs } = await (supabase as any)
    .from("circle_subscriptions")
    .select(
      "id, user_id, status, current_period_start, current_period_end, cancel_at_period_end, canceled_at, trial_ends_at, created_at",
    )
    .eq("circle_id", circle.id)
    .order("created_at", { ascending: false });

  const allSubs = (subs ?? []) as Array<{
    id: string;
    user_id: string;
    status: CircleSubscriptionStatus;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
    trial_ends_at: string | null;
    created_at: string;
  }>;

  const activeSubs = allSubs.filter((s) =>
    ["trialing", "active", "past_due"].includes(s.status),
  );
  const trialingSubs = activeSubs.filter((s) => s.status === "trialing");
  const priceCents = circle.price_cents ?? 0;
  const mrrCents = activeSubs.length * priceCents;
  const netMonthlyCents = Math.round(mrrCents * 0.9); // -10% commission

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const cancellations30d = allSubs.filter(
    (s) =>
      (s.canceled_at && s.canceled_at >= thirtyDaysAgo) ||
      (s.cancel_at_period_end &&
        ["trialing", "active"].includes(s.status)),
  ).length;

  /* Récupère les profils pour la liste (n'affiche pas trop d'infos
     personnelles — juste full_name + username). */
  const userIds = Array.from(new Set(allSubs.slice(0, 20).map((s) => s.user_id)));
  const { data: profiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", userIds)
      : { data: [] as Array<{ id: string; full_name: string | null; username: string | null }> };
  const profileById = new Map<
    string,
    { full_name: string | null; username: string | null }
  >();
  for (const p of (profiles ?? []) as Array<{
    id: string;
    full_name: string | null;
    username: string | null;
  }>) {
    profileById.set(p.id, p);
  }

  return (
    <div className="px-5 sm:px-8 py-6 max-w-3xl mx-auto">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gold-deep" aria-hidden />
          <h1 className="text-[15px] sm:text-[17px] font-bold text-night">
            Revenus du cercle
          </h1>
        </div>
        <Link
          href={`/circles/${slug}/settings`}
          className="inline-flex items-center gap-1 text-[12px] text-night-dim hover:text-night transition-colors"
        >
          <ArrowLeft className="w-3 h-3" aria-hidden />
          Settings
        </Link>
      </header>

      {/* KPI grid. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="MRR brut"
          value={`${(mrrCents / 100).toFixed(0)} €`}
          sublabel={`${(priceCents / 100).toFixed(2)} € × ${activeSubs.length}`}
          icon={TrendingUp}
          tone="gold"
        />
        <KpiCard
          label="Reçu (net)"
          value={`${(netMonthlyCents / 100).toFixed(0)} €`}
          sublabel="Après 10 % DIVARC"
          icon={TrendingUp}
          tone="emerald"
        />
        <KpiCard
          label="Abonnés actifs"
          value={String(activeSubs.length)}
          sublabel={`${trialingSubs.length} en essai`}
          icon={Users}
          tone="default"
        />
        <KpiCard
          label="Annulations 30j"
          value={String(cancellations30d)}
          sublabel="cancel_at_period_end inclus"
          icon={AlertTriangle}
          tone="rose"
        />
      </div>

      {/* Liste des subs récentes. */}
      <div className="rounded-2xl bg-white border border-line overflow-hidden">
        <div className="px-4 py-3 border-b border-line">
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-night-dim">
            20 dernières souscriptions
          </h2>
        </div>
        {allSubs.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-night-dim">
            Aucune souscription pour l&apos;instant. Partage le lien de ton
            cercle pour attirer tes premiers abonnés.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {allSubs.slice(0, 20).map((sub) => {
              const profile = profileById.get(sub.user_id);
              const name =
                profile?.full_name ?? profile?.username ?? "Utilisateur";
              const status = STATUS_LABELS[sub.status];
              const periodEnd = new Date(
                sub.current_period_end,
              ).toLocaleDateString("fr-FR");
              return (
                <li
                  key={sub.id}
                  className="px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-night truncate">
                      {name}
                    </p>
                    <p className="text-[11px] text-night-dim flex items-center gap-1.5 mt-0.5">
                      <CalendarClock className="w-3 h-3" aria-hidden />
                      Renouvellement {periodEnd}
                      {sub.cancel_at_period_end ? (
                        <span className="ml-1.5 text-amber-700 font-bold">
                          · annule
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-bold ${status.color}`}
                  >
                    {status.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-4 text-[11px] text-night-dim text-center">
        Les paiements sont envoyés directement sur ton compte Stripe Connect.
        Voir le détail des transactions sur ton dashboard Stripe.
      </p>
    </div>
  );
}

type KpiCardProps = {
  label: string;
  value: string;
  sublabel: string;
  icon: typeof TrendingUp;
  tone: "default" | "gold" | "emerald" | "rose";
};

function KpiCard({ label, value, sublabel, icon: Icon, tone }: KpiCardProps) {
  const toneClass =
    tone === "gold"
      ? "bg-gradient-to-br from-gold/15 to-cream-deep border-gold/30"
      : tone === "emerald"
        ? "bg-emerald-50 border-emerald-200"
        : tone === "rose"
          ? "bg-rose-50 border-rose-200"
          : "bg-white border-line";
  return (
    <div className={`rounded-2xl border p-3.5 shadow-soft ${toneClass}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-night-dim" aria-hidden />
        <p className="text-[10px] font-bold uppercase tracking-wider text-night-dim">
          {label}
        </p>
      </div>
      <p className="text-[20px] font-bold text-night leading-none">{value}</p>
      <p className="mt-1 text-[10px] text-night-dim">{sublabel}</p>
    </div>
  );
}
