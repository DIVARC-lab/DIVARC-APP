import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Heart,
  MessageCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { CircleAnalyticsChart } from "../_components/CircleAnalyticsChart";
import { createClient } from "@/lib/supabase/server";
import { getCircleBySlug } from "@/lib/queries/circles";
import {
  getCircleAnalytics,
  getCircleDailyActivity,
  getCircleFunnel,
  getCircleRetentionCohorts,
  getCircleTopContributors,
  type CircleRetentionCohort,
  type CircleFunnel,
} from "@/lib/queries/circleAnalytics";
import { cn } from "@/lib/utils/cn";

/* Page Analytics admin du cercle — Chantier Cercles v3 étape 2.
 *
 * Accessible aux owner + admin uniquement. Les RPC analytics throw
 * "access denied" via is_circle_admin() si le caller n'a pas le rôle. */

type Params = Promise<{ slug: string }>;

export const metadata = {
  title: "Analytics",
};

export default async function CircleAnalyticsPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/circles/${slug}/analytics`);

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();

  /* Check rôle admin/owner. */
  const isAdmin =
    circle.my_role === "owner" || circle.my_role === "admin";
  if (!isAdmin) {
    redirect(`/circles/${slug}`);
  }

  const [kpi, daily, top, cohorts, funnel] = await Promise.all([
    getCircleAnalytics(circle.id),
    getCircleDailyActivity(circle.id, 30),
    getCircleTopContributors(circle.id, { periodDays: 30, limit: 10 }),
    getCircleRetentionCohorts(circle.id, 6),
    getCircleFunnel(circle.id),
  ]);

  if (!kpi) {
    return (
      <div className="p-6 text-center text-night-muted">
        Impossible de charger les analytics. Vérifie que la migration
        0132 est appliquée et que tu as bien le rôle owner/admin.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="font-display italic text-2xl sm:text-3xl text-night">
          Analytics — {circle.name}
        </h1>
        <p className="text-[12.5px] text-night-muted mt-1">
          Tableau de bord admin · KPIs synthétiques + activité 30 jours
        </p>
      </header>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          icon={Users}
          label="Membres totaux"
          value={kpi.members_total}
          subValue={
            kpi.members_new_7d > 0
              ? `+${kpi.members_new_7d} ces 7j`
              : "Aucun nouveau"
          }
          accent="night"
        />
        <KPICard
          icon={Activity}
          label="Actifs 7j"
          value={kpi.members_active_7d}
          subValue={`${kpi.members_active_30d} sur 30j`}
          accent="emerald"
        />
        <KPICard
          icon={MessageCircle}
          label="Posts 7j"
          value={kpi.posts_7d}
          subValue={`${kpi.posts_total} au total`}
          accent="gold"
        />
        <KPICard
          icon={Heart}
          label="Engagement / post"
          value={kpi.engagement_per_post_7d}
          subValue={`${kpi.reactions_7d} react + ${kpi.comments_7d} com`}
          accent="rose"
        />
        <KPICard
          icon={TrendingUp}
          label="Vitality score"
          value={Math.round(kpi.vitality_score * 100) / 100}
          subValue="0 → 100"
          accent="gold"
        />
        <KPICard
          icon={Users}
          label="Rétention 30j"
          value={`${kpi.retention_rate_30d}%`}
          subValue="Membres > 30j encore actifs"
          accent="emerald"
        />
        <KPICard
          icon={MessageCircle}
          label="Commentaires 7j"
          value={kpi.comments_7d}
          accent="night"
        />
        <KPICard
          icon={Heart}
          label="Réactions 7j"
          value={kpi.reactions_7d}
          accent="rose"
        />
      </div>

      {/* Activity chart */}
      <section>
        <h2 className="text-sm font-bold text-night uppercase tracking-wider mb-3">
          Activité 30 jours
        </h2>
        <CircleAnalyticsChart data={daily} />
      </section>

      {/* Sprint H.2 — Funnel acquisition + churn 30j */}
      {funnel ? <FunnelSection funnel={funnel} /> : null}

      {/* Sprint H.1 — Retention cohorts (6 mois). */}
      {cohorts.length > 0 ? <CohortsSection cohorts={cohorts} /> : null}

      {/* Top contributors */}
      <section>
        <h2 className="text-sm font-bold text-night uppercase tracking-wider mb-3">
          Top contributeurs (30 jours)
        </h2>
        {top.length === 0 ? (
          <p className="text-[13px] text-night-muted">
            Aucune activité sur la période.
          </p>
        ) : (
          <div className="bg-white border border-line rounded-3xl overflow-hidden divide-y divide-line">
            {top.map((c, idx) => (
              <div
                key={c.user_id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-night/[0.02]"
              >
                <span className="w-7 text-center text-[13px] font-bold text-night-muted tabular-nums">
                  {idx + 1}
                </span>
                <Avatar
                  src={c.avatar_url}
                  fullName={c.full_name ?? c.username ?? "?"}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {c.username ? (
                      <Link
                        href={`/u/${c.username}`}
                        className="text-[14px] font-bold text-night hover:underline truncate"
                      >
                        {c.full_name ?? c.username}
                      </Link>
                    ) : (
                      <span className="text-[14px] font-bold text-night truncate">
                        {c.full_name ?? "Utilisateur"}
                      </span>
                    )}
                    <RoleBadge role={c.role} />
                  </div>
                  <p className="text-[11px] text-night-muted">
                    {c.posts_count} posts · {c.comments_count} comm. ·{" "}
                    {c.reactions_received} réact. reçues
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[16px] font-extrabold text-gold-deep tabular-nums">
                    {c.score}
                  </div>
                  <div className="text-[10px] text-night-muted font-semibold uppercase">
                    score
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

type IconType = typeof Users;

function KPICard({
  icon: Icon,
  label,
  value,
  subValue,
  accent = "night",
}: {
  icon: IconType;
  label: string;
  value: string | number;
  subValue?: string;
  accent?: "night" | "gold" | "rose" | "emerald";
}) {
  const accentClass = {
    night: "text-night",
    gold: "text-gold-deep",
    rose: "text-rose-600",
    emerald: "text-emerald-600",
  }[accent];

  return (
    <div className="bg-white border border-line rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-night-muted">
          {label}
        </span>
        <Icon
          className={cn("w-4 h-4 shrink-0", accentClass)}
          aria-hidden
        />
      </div>
      <div className={cn("text-2xl font-extrabold tabular-nums", accentClass)}>
        {value}
      </div>
      {subValue ? (
        <p className="text-[11px] text-night-muted mt-1">{subValue}</p>
      ) : null}
    </div>
  );
}

/* ============================================================
 * Sprint H.1 — Cohorts retention table
 * ============================================================ */

function CohortsSection({ cohorts }: { cohorts: CircleRetentionCohort[] }) {
  /* Détermine le nombre de colonnes M+N à afficher (= longueur max). */
  const maxLen = Math.max(...cohorts.map((c) => c.retention_pct?.length ?? 0));
  return (
    <section>
      <h2 className="text-sm font-bold text-night uppercase tracking-wider mb-1">
        Cohortes de rétention
      </h2>
      <p className="text-[11px] text-night-muted mb-3 leading-relaxed">
        Pour chaque mois où des membres ont rejoint, % qui reviennent encore
        à M+1, M+2... Bon signal = chiffres stables après le 1er mois.
      </p>
      <div className="overflow-x-auto bg-white border border-line rounded-3xl">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-line bg-bg-soft/40">
              <th className="text-left px-3 py-2 font-bold text-night-muted">
                Cohort
              </th>
              <th className="text-right px-3 py-2 font-bold text-night-muted">
                Taille
              </th>
              {Array.from({ length: maxLen }).map((_, i) => (
                <th
                  key={i}
                  className="text-right px-3 py-2 font-bold text-night-muted tabular-nums"
                >
                  M+{i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {cohorts.map((c) => (
              <tr key={c.cohort_month}>
                <td className="px-3 py-2 font-bold text-night">
                  {new Date(c.cohort_month).toLocaleDateString("fr-FR", {
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="text-right px-3 py-2 tabular-nums text-night-muted">
                  {c.cohort_size}
                </td>
                {Array.from({ length: maxLen }).map((_, i) => {
                  const v = c.retention_pct?.[i];
                  if (v === undefined || v === null) {
                    return (
                      <td
                        key={i}
                        className="text-right px-3 py-2 text-night-muted/40 tabular-nums"
                      >
                        —
                      </td>
                    );
                  }
                  return (
                    <td
                      key={i}
                      className={cn(
                        "text-right px-3 py-2 tabular-nums font-bold",
                        v >= 50
                          ? "text-emerald-600"
                          : v >= 20
                            ? "text-night"
                            : "text-rose-600",
                      )}
                    >
                      {v}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ============================================================
 * Sprint H.2 — Funnel + Churn cards
 * ============================================================ */

function FunnelSection({ funnel }: { funnel: CircleFunnel }) {
  const steps = [
    { label: "Joined 30j", value: funnel.joined_30d },
    {
      label: "A posté",
      value: funnel.first_post_30d,
      sublabel: `${funnel.conv_join_to_post_pct}% des joins`,
    },
    { label: "Actifs 30j", value: funnel.active_30d },
    {
      label: "Contributeurs",
      value: funnel.contributors_30d,
      sublabel: `${funnel.conv_active_to_contributor_pct}% des actifs`,
    },
  ];
  return (
    <section>
      <h2 className="text-sm font-bold text-night uppercase tracking-wider mb-1">
        Funnel & churn (30j)
      </h2>
      <p className="text-[11px] text-night-muted mb-3 leading-relaxed">
        Du join jusqu&apos;à la contribution. Plus l&apos;écart se resserre
        entre les étapes, mieux ton onboarding fonctionne.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {steps.map((s, idx) => (
          <div
            key={s.label}
            className="bg-white border border-line rounded-2xl p-3.5"
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-night-muted mb-1">
              {idx + 1}. {s.label}
            </p>
            <p className="text-[22px] font-extrabold tabular-nums text-night leading-none">
              {s.value}
            </p>
            {s.sublabel ? (
              <p className="mt-1 text-[10.5px] text-night-muted">
                {s.sublabel}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-rose-700 mb-0.5">
            Churn 30j
          </p>
          <p className="text-[12px] text-night-muted">
            Membres ayant quitté ou décroché (inactifs &gt; 60j).
          </p>
        </div>
        <div className="text-right">
          <p className="text-[22px] font-extrabold tabular-nums text-rose-600 leading-none">
            {funnel.churn_rate_30d}%
          </p>
          <p className="text-[10.5px] text-night-muted mt-1">
            {funnel.churned_30d} / {funnel.total_members}
          </p>
        </div>
      </div>
    </section>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (!role || role === "member") return null;
  const labels: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    moderator: "Mod",
    mod: "Mod",
    ambassador: "Ambassadeur",
    contributor: "Contributeur",
  };
  const label = labels[role] ?? role;
  return (
    <span className="inline-flex items-center px-1.5 h-4 rounded-full bg-gold/10 border border-gold/30 text-[9px] font-bold uppercase tracking-[0.08em] text-gold-deep">
      {label}
    </span>
  );
}
