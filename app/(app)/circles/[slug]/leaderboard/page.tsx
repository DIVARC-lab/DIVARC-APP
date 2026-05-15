import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Award, Crown, MessageCircle, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/server";
import { getCircleBySlug } from "@/lib/queries/circles";
import { getCircleTopContributors } from "@/lib/queries/circleAnalytics";
import { cn } from "@/lib/utils/cn";

/* Page Leaderboard du cercle — Chantier Cercles v3 étape 3.
 *
 * Accessible à tous les membres actifs (vs Analytics admin-only).
 * Réutilise la RPC get_circle_top_contributors mais ne nécessite pas
 * is_circle_admin (la RPC a son propre check qui throw si non-admin).
 * Pour les non-admins, on appelle un wrapper qui contourne le check
 * via un mode "public" SECURITY DEFINER bypass. Pour V1 : on ouvre
 * juste la RPC à tous les membres. */

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ period?: "7" | "30" | "all" }>;

export const metadata = {
  title: "Classement",
};

const PERIOD_LABELS = {
  "7": "7 derniers jours",
  "30": "30 derniers jours",
  all: "Tout l'historique",
} as const;

export default async function CircleLeaderboardPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const { period: rawPeriod } = await searchParams;
  const period: "7" | "30" | "all" = rawPeriod === "7" || rawPeriod === "all" ? rawPeriod : "30";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/circles/${slug}/leaderboard`);

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();

  /* Check membre actif. */
  if (!circle.is_member || !circle.my_role) {
    redirect(`/circles/${slug}/about`);
  }

  const periodDays = period === "all" ? 36500 /* ~100 ans = tout */ : Number(period);
  const top = await getCircleTopContributors(circle.id, {
    periodDays,
    limit: 50,
  });

  /* Tu es classé où ? */
  const myRank = top.findIndex((c) => c.user_id === user.id);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="font-display italic text-2xl sm:text-3xl text-night flex items-center gap-2">
          <Trophy className="w-6 h-6 text-gold-deep" aria-hidden />
          Classement
        </h1>
        <p className="text-[12.5px] text-night-muted mt-1">
          Les membres les plus actifs de #{circle.name} ·{" "}
          {PERIOD_LABELS[period]}
        </p>
      </header>

      {/* Period switcher */}
      <div
        role="tablist"
        aria-label="Période du classement"
        className="inline-flex items-center gap-1 p-1 rounded-full bg-night/5 border border-line"
      >
        {(["7", "30", "all"] as const).map((p) => (
          <Link
            key={p}
            href={`/circles/${slug}/leaderboard?period=${p}`}
            role="tab"
            aria-selected={period === p}
            className={cn(
              "px-4 py-1.5 rounded-full text-[12px] font-bold transition-colors",
              period === p
                ? "bg-night text-cream"
                : "text-night-muted hover:text-night",
            )}
          >
            {p === "7" ? "7 jours" : p === "30" ? "30 jours" : "Tout"}
          </Link>
        ))}
      </div>

      {/* Mon rang */}
      {myRank >= 0 ? (
        <div className="bg-gold/10 border border-gold/30 rounded-2xl px-4 py-3 flex items-center gap-3">
          <Award className="w-5 h-5 text-gold-deep" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-night">
              Tu es classé #{myRank + 1} avec {top[myRank].score} points
            </p>
            <p className="text-[11px] text-night-muted">
              {top[myRank].posts_count} posts · {top[myRank].comments_count}{" "}
              commentaires
            </p>
          </div>
        </div>
      ) : null}

      {/* Podium top 3 */}
      {top.length >= 3 ? (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <PodiumCard rank={2} contributor={top[1]} />
          <PodiumCard rank={1} contributor={top[0]} />
          <PodiumCard rank={3} contributor={top[2]} />
        </div>
      ) : null}

      {/* Liste */}
      <section>
        <h2 className="text-sm font-bold text-night uppercase tracking-wider mb-3">
          Top contributeurs
        </h2>
        {top.length === 0 ? (
          <p className="text-[13px] text-night-muted">
            Aucune activité sur cette période. Sois le premier à contribuer !
          </p>
        ) : (
          <div className="bg-white border border-line rounded-3xl overflow-hidden divide-y divide-line">
            {top.map((c, idx) => (
              <div
                key={c.user_id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  c.user_id === user.id && "bg-gold/5",
                  idx < 3 && "bg-gold/[0.02]",
                )}
              >
                <span
                  className={cn(
                    "w-7 text-center text-[14px] font-extrabold tabular-nums shrink-0",
                    idx === 0
                      ? "text-gold-deep"
                      : idx === 1
                        ? "text-night/70"
                        : idx === 2
                          ? "text-amber-700"
                          : "text-night-muted",
                  )}
                >
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
                    {c.posts_count > 0 ? `${c.posts_count} posts` : ""}
                    {c.posts_count > 0 && c.comments_count > 0 ? " · " : ""}
                    {c.comments_count > 0
                      ? `${c.comments_count} commentaires`
                      : ""}
                    {c.reactions_received > 0
                      ? ` · ${c.reactions_received} ❤️`
                      : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[16px] font-extrabold text-gold-deep tabular-nums">
                    {c.score}
                  </div>
                  <div className="text-[10px] text-night-muted font-semibold uppercase">
                    points
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer : comment ça marche */}
      <section className="bg-night/[0.03] rounded-2xl p-4 border border-line">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-night-muted mb-2">
          Comment fonctionne le score ?
        </h3>
        <ul className="space-y-1 text-[12.5px] text-night/80">
          <li>
            <MessageCircle className="w-3 h-3 inline mr-1.5 text-night-muted" />
            1 post publié = <strong className="text-night">10 points</strong>
          </li>
          <li>
            <MessageCircle className="w-3 h-3 inline mr-1.5 text-night-muted" />
            1 commentaire publié = <strong className="text-night">3 points</strong>
          </li>
          <li>
            <Crown className="w-3 h-3 inline mr-1.5 text-night-muted" />
            1 réaction reçue sur tes posts = <strong className="text-night">1 point</strong>
          </li>
        </ul>
      </section>
    </div>
  );
}

function PodiumCard({
  rank,
  contributor,
}: {
  rank: 1 | 2 | 3;
  contributor: { user_id: string; full_name: string | null; username: string | null; avatar_url: string | null; score: number };
}) {
  const c = contributor;
  const podiumStyles = {
    1: "bg-gradient-to-b from-gold/20 to-gold/5 border-gold/40 scale-110",
    2: "bg-gradient-to-b from-night/10 to-night/[0.02] border-night/20",
    3: "bg-gradient-to-b from-amber-100 to-amber-50 border-amber-300/40",
  }[rank];
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";

  return (
    <div
      className={cn(
        "rounded-2xl border p-3 sm:p-4 flex flex-col items-center text-center",
        podiumStyles,
      )}
    >
      <div className="text-2xl sm:text-3xl mb-1">{medal}</div>
      <Avatar
        src={c.avatar_url}
        fullName={c.full_name ?? c.username ?? "?"}
        size="md"
      />
      <div className="mt-2 text-[12px] sm:text-[13px] font-bold text-night truncate max-w-full">
        {c.full_name ?? c.username ?? "Anonyme"}
      </div>
      <div className="text-[14px] sm:text-[16px] font-extrabold text-gold-deep tabular-nums">
        {c.score} pts
      </div>
    </div>
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
