import { Check, Gavel, History, Inbox, Shield, X } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { getCircleBySlug } from "@/lib/queries/circles";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils/relativeTime";
import type {
  CircleModerationAction,
  CircleModerationActionType,
} from "@/lib/database.types";
import { MemberSanctionRow } from "./_components/MemberSanctionRow";
import { ModerationActionsBar } from "./_components/ModerationActionsBar";

type Params = Promise<{ slug: string }>;

export const metadata = { title: "Modération du cercle" };

const ACTION_LABELS: Record<CircleModerationActionType, string> = {
  post_approved: "Post approuvé",
  post_rejected: "Post refusé",
  post_pinned: "Post épinglé",
  post_unpinned: "Post désépinglé",
  post_locked: "Post verrouillé",
  post_unlocked: "Post déverrouillé",
  post_announcement_set: "Marqué annonce",
  post_announcement_unset: "Annonce retirée",
  member_promoted: "Membre promu",
  member_demoted: "Membre rétrogradé",
  member_warned: "Avertissement",
  member_muted: "Membre mute",
  member_unmuted: "Mute retiré",
  member_banned: "Membre banni",
  member_unbanned: "Bannissement levé",
  rule_added: "Règle ajoutée",
  rule_removed: "Règle supprimée",
  rule_updated: "Règle modifiée",
  flair_added: "Flair ajouté",
  flair_removed: "Flair supprimé",
};

const ACTION_TONE: Record<CircleModerationActionType, string> = {
  post_approved: "bg-emerald-50 text-emerald-700",
  post_rejected: "bg-red-50 text-red-700",
  post_pinned: "bg-gold/15 text-gold-deep",
  post_unpinned: "bg-bg-soft text-night-dim",
  post_locked: "bg-night/10 text-night",
  post_unlocked: "bg-bg-soft text-night-dim",
  post_announcement_set: "bg-violet-50 text-violet-700",
  post_announcement_unset: "bg-bg-soft text-night-dim",
  member_promoted: "bg-emerald-50 text-emerald-700",
  member_demoted: "bg-amber-50 text-amber-700",
  member_warned: "bg-amber-50 text-amber-700",
  member_muted: "bg-night/10 text-night",
  member_unmuted: "bg-bg-soft text-night-dim",
  member_banned: "bg-red-50 text-red-700",
  member_unbanned: "bg-emerald-50 text-emerald-700",
  rule_added: "bg-bg-soft text-night",
  rule_removed: "bg-bg-soft text-night-dim",
  rule_updated: "bg-bg-soft text-night",
  flair_added: "bg-bg-soft text-night",
  flair_removed: "bg-bg-soft text-night-dim",
};

export default async function CircleModerationPage({
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

  /* Permission : owner / admin / moderator only. */
  const isMod =
    circle.owner_id === user.id ||
    circle.my_role === "admin" ||
    circle.my_role === "moderator" ||
    circle.my_role === "mod";

  if (!isMod) {
    return (
      <div className="px-5 sm:px-8 py-10 text-center">
        <p className="text-[14px] text-night-dim">
          Seuls les modérateurs peuvent accéder à cette page.
        </p>
      </div>
    );
  }

  /* Posts en attente d'approbation (requires_approval=true & approved_at=null). */
  const { data: pendingPosts } = await supabase
    .from("posts")
    .select("id, body, author_id, created_at")
    .eq("circle_id", circle.id)
    .eq("requires_approval", true)
    .is("approved_at", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(50);

  const pendingList =
    (pendingPosts as Array<{
      id: string;
      body: string | null;
      author_id: string;
      created_at: string;
    }> | null) ?? [];

  /* Historique modération (50 dernières actions). */
  const { data: logs } = await supabase
    .from("circle_moderation_actions")
    .select("*")
    .eq("circle_id", circle.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const logList = (logs ?? []) as CircleModerationAction[];

  /* Membres sanctionnables (warnings_count > 0 OU muted OU banned OU
   * actifs récents — pour donner une vue actionnable). */
  const { data: flaggedMembers } = await supabase
    .from("circle_members")
    .select("user_id, role, warnings_count, is_muted, is_banned, last_active_at")
    .eq("circle_id", circle.id)
    .or("is_muted.eq.true,is_banned.eq.true,warnings_count.gt.0")
    .order("is_banned", { ascending: false })
    .order("is_muted", { ascending: false })
    .order("warnings_count", { ascending: false })
    .limit(20);
  const flaggedList =
    (flaggedMembers as Array<{
      user_id: string;
      role: string;
      warnings_count: number;
      is_muted: boolean;
      is_banned: boolean;
    }> | null) ?? [];

  /* Profiles batch (auteurs + acteurs + targets + flagged). */
  const userIds = new Set<string>();
  for (const p of pendingList) userIds.add(p.author_id);
  for (const l of logList) {
    userIds.add(l.actor_user_id);
    if (l.target_user_id) userIds.add(l.target_user_id);
  }
  for (const m of flaggedList) userIds.add(m.user_id);
  const profileMap = new Map<
    string,
    { id: string; full_name: string | null; username: string | null; avatar_url: string | null }
  >();
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", Array.from(userIds));
    for (const p of profiles ?? []) profileMap.set(p.id, p);
  }

  const canManageAutomod = circle.owner_id === user.id || circle.my_role === "admin";

  return (
    <div className="px-5 sm:px-8 pb-10 space-y-6">
      <header className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gold-deep" aria-hidden />
          <h1 className="text-[15px] sm:text-[17px] font-bold text-night">
            Modération du cercle
          </h1>
        </div>
        {canManageAutomod ? (
          <a
            href={`/circles/${slug}/moderation/automod`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-line text-night text-[11px] font-bold hover:border-gold/40 transition-colors"
          >
            <Gavel className="w-3 h-3" aria-hidden />
            AutoMod
          </a>
        ) : null}
      </header>

      {/* Posts à approuver */}
      <section className="rounded-2xl bg-white border border-line overflow-hidden">
        <header className="px-4 py-3 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-amber-600" aria-hidden />
            <KickerLabel>
              À approuver ({pendingList.length})
            </KickerLabel>
          </div>
        </header>
        {pendingList.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-night-dim">
            <Check
              className="w-8 h-8 mx-auto mb-2 text-emerald-500"
              aria-hidden
            />
            Aucun post en attente. La file est à jour.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {pendingList.map((post) => {
              const author = profileMap.get(post.author_id);
              return (
                <li key={post.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <Avatar
                      src={author?.avatar_url ?? null}
                      fullName={author?.full_name ?? author?.username ?? "—"}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-night">
                        {author?.full_name ?? author?.username ?? "Utilisateur"}
                        <span className="text-night-dim font-normal ml-2">
                          · {formatRelative(post.created_at)}
                        </span>
                      </p>
                      <p className="mt-1 text-[13px] text-night-soft line-clamp-4 whitespace-pre-wrap">
                        {post.body ?? "(post sans texte)"}
                      </p>
                      <div className="mt-2">
                        <ModerationActionsBar postId={post.id} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Sanctions / membres flaggés */}
      <section className="rounded-2xl bg-white border border-line overflow-hidden">
        <header className="px-4 py-3 border-b border-line flex items-center gap-2">
          <Gavel className="w-4 h-4 text-red-700" aria-hidden />
          <KickerLabel>
            Membres sous surveillance ({flaggedList.length})
          </KickerLabel>
        </header>
        {flaggedList.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-night-dim">
            <Check
              className="w-8 h-8 mx-auto mb-2 text-emerald-500"
              aria-hidden
            />
            Aucun membre n&apos;a de sanction active. 6 niveaux progressifs
            sont disponibles : avertissement / mute 1h-7j / ban 30j /
            ban définitif.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {flaggedList.map((m) => (
              <li key={m.user_id}>
                <MemberSanctionRow
                  circleId={circle.id}
                  member={{
                    user_id: m.user_id,
                    profile: profileMap.get(m.user_id) ?? null,
                    role: m.role,
                    warnings_count: m.warnings_count,
                    is_muted: m.is_muted,
                    is_banned: m.is_banned,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Logs */}
      <section className="rounded-2xl bg-white border border-line overflow-hidden">
        <header className="px-4 py-3 border-b border-line flex items-center gap-2">
          <History className="w-4 h-4 text-night-dim" aria-hidden />
          <KickerLabel>Historique (50 dernières actions)</KickerLabel>
        </header>
        {logList.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-night-dim">
            Aucune action de modération encore.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {logList.map((log) => {
              const actor = profileMap.get(log.actor_user_id);
              const target = log.target_user_id
                ? profileMap.get(log.target_user_id)
                : null;
              return (
                <li key={log.id} className="px-4 py-2.5 flex items-start gap-3">
                  <span
                    className={`shrink-0 inline-flex h-6 px-2 rounded-full items-center text-[10px] font-extrabold uppercase tracking-wider ${ACTION_TONE[log.action_type]}`}
                  >
                    {ACTION_LABELS[log.action_type]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-night">
                      <strong className="font-bold">
                        {actor?.full_name ?? actor?.username ?? "—"}
                      </strong>
                      {target ? (
                        <>
                          {" → "}
                          <strong className="font-bold">
                            {target.full_name ?? target.username ?? "—"}
                          </strong>
                        </>
                      ) : null}
                    </p>
                    {log.reason ? (
                      <p className="text-[11px] text-night-dim italic mt-0.5">
                        « {log.reason} »
                      </p>
                    ) : null}
                  </div>
                  <X
                    aria-hidden
                    className="hidden"
                  />
                  <span className="shrink-0 text-[10px] text-night-dim tabular-nums">
                    {formatRelative(log.created_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
