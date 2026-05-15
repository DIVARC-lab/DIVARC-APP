/* UserReputationCard — affiche la réputation portable d'un user
 * (karma cumulé cross-cercles + top cercles + badges rôles).
 *
 * Server Component. Utilisable dans /profile, /u/[username] et
 * tout autre contexte où on veut afficher l'engagement cercles
 * d'un utilisateur. */

import Link from "next/link";
import { Award, Crown, Shield, Sparkles, Star } from "lucide-react";
import { getUserGlobalReputation } from "@/lib/queries/circleHubs";
import { cn } from "@/lib/utils/cn";

type Props = {
  userId: string;
  /** Compact = pas le détail des badges. */
  compact?: boolean;
};

const ROLE_META: Record<string, { label: string; Icon: typeof Crown; color: string }> = {
  owner: { label: "Owner", Icon: Crown, color: "text-gold-deep" },
  admin: { label: "Admin", Icon: Shield, color: "text-rose-600" },
  moderator: { label: "Mod", Icon: Shield, color: "text-emerald-600" },
  mod: { label: "Mod", Icon: Shield, color: "text-emerald-600" },
  ambassador: { label: "Ambassadeur", Icon: Star, color: "text-amber-600" },
};

export async function UserReputationCard({ userId, compact = false }: Props) {
  const rep = await getUserGlobalReputation(userId);
  if (!rep || rep.total_karma === 0) return null;

  return (
    <section
      className={cn(
        "bg-gradient-to-br from-gold/10 via-white to-bg border border-gold/20 rounded-3xl p-5",
      )}
    >
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold-deep" aria-hidden />
          <h3 className="text-sm font-bold text-night uppercase tracking-wider">
            Réputation cercles
          </h3>
        </div>
        <Link
          href="/circles/hubs"
          className="text-[11px] font-bold text-gold-deep hover:underline"
        >
          Découvrir →
        </Link>
      </header>

      {/* Score global */}
      <div className="flex items-baseline gap-3 mb-4">
        <div className="text-4xl font-extrabold text-gold-deep tabular-nums">
          {rep.total_karma.toLocaleString("fr-FR")}
        </div>
        <div className="text-[12px] text-night-muted">
          karma cumulé sur{" "}
          <strong className="text-night">{rep.circles_count}</strong>{" "}
          cercle{rep.circles_count > 1 ? "s" : ""}
        </div>
      </div>

      {/* Top 3 cercles */}
      {rep.top_circles.length > 0 ? (
        <div className="space-y-2 mb-4">
          <h4 className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-night-muted">
            Top cercles
          </h4>
          {rep.top_circles.map((tc, idx) => (
            <Link
              key={tc.circle_id}
              href={`/circles/${tc.circle_slug}`}
              className="flex items-center gap-3 p-2 rounded-xl bg-white border border-line hover:border-night/30 transition-colors"
            >
              <span className="w-7 text-center text-[12px] font-extrabold text-night-muted tabular-nums">
                {idx + 1}
              </span>
              <span className="text-2xl">
                {tc.circle_emoji ?? tc.circle_name[0]?.toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-night truncate">
                  {tc.circle_name}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[13px] font-extrabold text-gold-deep tabular-nums">
                  {tc.points}
                </div>
                <div className="text-[9px] text-night-muted font-bold uppercase">
                  pts
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {/* Badges rôles */}
      {!compact && rep.badges.length > 0 ? (
        <div>
          <h4 className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-night-muted mb-2">
            Badges ({rep.badges.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {rep.badges.map((badge) => {
              const meta = ROLE_META[badge.role];
              if (!meta) return null;
              const Icon = meta.Icon;
              return (
                <Link
                  key={`${badge.circle_id}-${badge.role}`}
                  href={`/circles/${badge.circle_slug}`}
                  className="inline-flex items-center gap-1 px-2.5 h-6 rounded-full bg-white border border-line text-[10px] font-bold hover:border-night/30"
                  title={`${meta.label} de ${badge.circle_name}`}
                >
                  <Icon
                    className={cn("w-2.5 h-2.5", meta.color)}
                    aria-hidden
                  />
                  <span className="text-night-muted">{meta.label}</span>
                  <span className="text-night truncate max-w-[100px]">
                    {badge.circle_name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <p className="mt-4 pt-3 border-t border-line text-[10px] text-night-muted leading-relaxed">
        <Award className="w-3 h-3 inline mr-1" aria-hidden />
        Karma = posts (10pts) + commentaires (3pts) + réactions reçues
        (1pt) sur tous les cercles.
      </p>
    </section>
  );
}
