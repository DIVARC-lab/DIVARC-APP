import { Crown, Shield, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { KickerLabel } from "@/components/ui/KickerLabel";
import {
  getCircleBySlug,
  listCircleMembersGrouped,
} from "@/lib/queries/circles";
import { createClient } from "@/lib/supabase/server";
import type { CircleMemberWithProfile } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { MemberAdminMenu } from "./MemberAdminMenu";

type Params = Promise<{ slug: string }>;

export const metadata = { title: "Membres" };

const ROLE_META: Record<
  string,
  { label: string; icon: typeof Crown; class: string }
> = {
  owner: {
    label: "Fondateur",
    icon: Crown,
    class: "bg-gold/15 text-gold-deep border-gold/30",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    class: "bg-night text-cream border-night",
  },
  moderator: {
    label: "Modérateur",
    icon: Shield,
    class: "bg-night/10 text-night border-night/20",
  },
  mod: {
    label: "Modérateur",
    icon: Shield,
    class: "bg-night/10 text-night border-night/20",
  },
  ambassador: {
    label: "Ambassadeur",
    icon: Sparkles,
    class: "bg-violet-50 text-violet-700 border-violet-200",
  },
  contributor: {
    label: "Contributeur",
    icon: Sparkles,
    class: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

/* Onglet Membres v2 — 3 buckets transparents :
 *  1. Équipe : owner + admin + moderator + ambassador
 *  2. Membres actifs : last_active_at < 7j
 *  3. Tous les autres
 *
 * Actions admin (promote/demote/mute/ban) au Chantier 4 (dashboard admin). */
export default async function CircleMembersTab({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();

  const { team, active, all, totalCount } = await listCircleMembersGrouped(
    circle.id,
  );

  /* Sprint Members admin — qui peut sanctionner. */
  const canModerate =
    circle.owner_id === user.id ||
    circle.my_role === "admin" ||
    circle.my_role === "moderator" ||
    circle.my_role === "mod";

  return (
    <section className="px-5 sm:px-8 pb-8">
      <header className="pb-4 flex items-center gap-2">
        <Users className="w-4 h-4 text-gold-deep" aria-hidden />
        <KickerLabel>
          {totalCount.toLocaleString("fr-FR")} membre
          {totalCount > 1 ? "s" : ""}
        </KickerLabel>
      </header>

      {/* Équipe */}
      {team.length > 0 ? (
        <div className="mb-6">
          <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gold-deep mb-2.5">
            · Équipe
          </h3>
          <ul className="space-y-2">
            {team.map((m) => (
              <li key={m.user_id}>
                <MemberRow
                  member={m}
                  variant="full"
                  circleId={circle.id}
                  circleOwnerId={circle.owner_id}
                  currentUserId={user.id}
                  canModerate={canModerate}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Membres actifs (7j) */}
      {active.length > 0 ? (
        <div className="mb-6">
          <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gold-deep mb-2.5">
            · Actifs cette semaine ({active.length})
          </h3>
          <ul className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {active.map((m) => (
              <li key={m.user_id}>
                <MemberAvatar member={m} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Tous les autres */}
      {all.length > 0 ? (
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gold-deep mb-2.5">
            · Tous les membres
            {totalCount > all.length + active.length + team.length
              ? ` (${all.length} affichés sur ${totalCount - active.length - team.length})`
              : ""}
          </h3>
          <ul className="grid sm:grid-cols-2 gap-2">
            {all.map((m) => (
              <li key={m.user_id}>
                <MemberRow
                  member={m}
                  variant="compact"
                  circleId={circle.id}
                  circleOwnerId={circle.owner_id}
                  currentUserId={user.id}
                  canModerate={canModerate}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {team.length === 0 && active.length === 0 && all.length === 0 ? (
        <p className="text-[13px] text-night-dim">
          Personne pour l&apos;instant.
        </p>
      ) : null}
    </section>
  );
}

function MemberRow({
  member,
  variant,
  circleId,
  circleOwnerId,
  currentUserId,
  canModerate,
}: {
  member: CircleMemberWithProfile;
  variant: "full" | "compact";
  circleId: string;
  circleOwnerId: string;
  currentUserId: string;
  canModerate: boolean;
}) {
  const profile = member.profile;
  const name = profile?.full_name ?? profile?.username ?? "Utilisateur";
  const roleMeta = ROLE_META[member.role];
  const RoleIcon = roleMeta?.icon;

  /* Le owner du cercle est intouchable. On ne peut pas non plus
     se sanctionner soi-même. */
  const showAdminMenu =
    canModerate &&
    member.user_id !== circleOwnerId &&
    member.user_id !== currentUserId;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-white border border-line hover:border-gold/40 transition-colors",
        variant === "full" ? "p-3" : "p-2.5",
      )}
    >
      <Link
        href={profile?.username ? `/u/${profile.username}` : "#"}
        className="flex-1 flex items-center gap-3 min-w-0"
      >
        <Avatar
          src={profile?.avatar_url ?? null}
          fullName={name}
          size={variant === "full" ? "md" : "sm"}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-night truncate">{name}</p>
          {profile?.username ? (
            <p className="text-[11px] text-night-dim truncate">
              @{profile.username}
            </p>
          ) : null}
          {(
            member as unknown as { badge?: string | null }
          ).badge ? (
            <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wider text-gold-deep">
              {(member as unknown as { badge?: string | null }).badge}
            </p>
          ) : null}
        </div>
        {roleMeta && member.role !== "member" ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider shrink-0",
              roleMeta.class,
            )}
          >
            {RoleIcon ? <RoleIcon className="w-3 h-3" aria-hidden /> : null}
            {roleMeta.label}
          </span>
        ) : null}
      </Link>
      {showAdminMenu ? (
        <MemberAdminMenu
          circleId={circleId}
          targetUserId={member.user_id}
          targetName={name}
        />
      ) : null}
    </div>
  );
}

function MemberAvatar({ member }: { member: CircleMemberWithProfile }) {
  const profile = member.profile;
  const name = profile?.full_name ?? profile?.username ?? "Utilisateur";
  return (
    <Link
      href={profile?.username ? `/u/${profile.username}` : "#"}
      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-bg-soft transition-colors"
    >
      <Avatar src={profile?.avatar_url ?? null} fullName={name} size="md" />
      <p className="text-[11px] font-semibold text-night truncate w-full text-center">
        {profile?.username ? `@${profile.username}` : name.split(" ")[0]}
      </p>
    </Link>
  );
}
