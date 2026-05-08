import { ArrowLeft, Lock, MessageSquareText, Users2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import {
  getCircleBySlug,
  listCircleMembers,
} from "@/lib/queries/circles";
import { listCirclePosts } from "@/lib/queries/posts";
import { getCurrentProfile } from "@/lib/queries/profile";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import type { CircleColor } from "@/lib/database.types";
import { PostCard } from "@/app/(app)/feed/_components/PostCard";
import { CircleMembershipButton } from "./CircleMembershipButton";
import { CirclePostComposer } from "./CirclePostComposer";

type Params = Promise<{ slug: string }>;

const COLOR_HERO: Record<CircleColor, string> = {
  gold: "bg-gradient-to-br from-gold via-gold-soft to-gold-deep text-night",
  navy: "bg-gradient-to-br from-night via-night-soft to-night-muted text-cream",
  emerald: "bg-gradient-to-br from-emerald-500 to-emerald-800 text-cream",
  rose: "bg-gradient-to-br from-rose-400 to-rose-700 text-cream",
  violet: "bg-gradient-to-br from-violet-400 to-violet-700 text-cream",
  cream: "bg-gradient-to-br from-cream via-bg to-gold/30 text-night",
};

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { title: "Cercle" };
  const circle = await getCircleBySlug(slug, user.id);
  return { title: circle?.name ?? "Cercle" };
}

export default async function CircleDetailPage({
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

  const [members, profile, posts] = await Promise.all([
    listCircleMembers(circle.id, 12),
    getCurrentProfile(),
    circle.is_member ? listCirclePosts(circle.id, user.id, 30) : Promise.resolve([]),
  ]);
  const tone = COLOR_HERO[circle.color ?? "gold"];
  const isOwner = circle.owner_id === user.id;
  const fullName = profile?.full_name ?? user.email?.split("@")[0] ?? null;

  return (
    <div className="px-4 sm:px-10 py-10 max-w-4xl mx-auto w-full">
      <Link
        href="/circles"
        className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-4"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Retour
      </Link>

      {/* Hero */}
      <header
        className={cn(
          "rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5 shadow-soft",
          tone,
        )}
      >
        <span
          aria-hidden
          className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl shrink-0"
        >
          {circle.emoji ?? circle.name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-[11px] font-extrabold uppercase tracking-[0.18em]",
                circle.color === "navy" ||
                  circle.color === "emerald" ||
                  circle.color === "rose" ||
                  circle.color === "violet"
                  ? "text-cream/85"
                  : "text-night/85",
              )}
            >
              · {circle.is_private ? "Cercle privé" : "Cercle public"}
            </span>
            {circle.is_private ? (
              <Lock className="w-3 h-3" aria-hidden />
            ) : null}
          </div>
          <h1 className="mt-1 font-display italic text-3xl sm:text-4xl leading-tight">
            {circle.name}
          </h1>
          <p
            className={cn(
              "mt-2 text-sm",
              circle.color === "navy" ||
                circle.color === "emerald" ||
                circle.color === "rose" ||
                circle.color === "violet"
                ? "text-cream/85"
                : "text-night/80",
            )}
          >
            <Users2 className="w-3.5 h-3.5 inline mr-1" aria-hidden />
            {circle.members_count.toLocaleString("fr-FR")} membre
            {circle.members_count > 1 ? "s" : ""}
          </p>
        </div>
        <CircleMembershipButton
          circleId={circle.id}
          isMember={circle.is_member}
          isOwner={isOwner}
        />
      </header>

      {circle.description ? (
        <section className="mt-8">
          <KickerLabel>À propos</KickerLabel>
          <p className="mt-3 text-sm leading-relaxed text-night-muted whitespace-pre-line">
            {circle.description}
          </p>
        </section>
      ) : null}

      {circle.is_member ? (
        <section className="mt-10" aria-label="Discussions">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquareText className="w-4 h-4 text-gold-deep" aria-hidden />
            <KickerLabel>Discussions</KickerLabel>
          </div>

          <CirclePostComposer
            circleId={circle.id}
            authorName={fullName}
            authorAvatarUrl={profile?.avatar_url ?? null}
          />

          {posts.length === 0 ? (
            <p className="mt-6 text-sm text-muted text-center py-8 rounded-2xl border border-dashed border-line">
              Aucun message pour l'instant. <span className="italic font-display text-night">Lance la conversation.</span>
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {posts.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} currentUserId={user.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <KickerLabel>Membres</KickerLabel>
          {circle.members_count > members.length ? (
            <span className="text-xs text-muted">
              {members.length} sur {circle.members_count}
            </span>
          ) : null}
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-muted">Personne pour l'instant.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-2">
            {members.map((m) => {
              const profile = m.profile;
              const name =
                profile?.full_name ?? profile?.username ?? "Utilisateur";
              return (
                <li key={m.user_id}>
                  <Link
                    href={profile?.username ? `/u/${profile.username}` : "#"}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-line hover:border-gold/40 transition-colors"
                  >
                    <Avatar
                      src={profile?.avatar_url ?? null}
                      fullName={name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-night truncate">
                        {name}
                      </p>
                      {profile?.username ? (
                        <p className="text-xs text-muted truncate">
                          @{profile.username}
                        </p>
                      ) : null}
                    </div>
                    {m.role !== "member" ? (
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-gold-deep">
                        {m.role === "admin" ? "Admin" : "Mod"}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Future : événements, annonces épinglées (V3) */}
      <section className="mt-12">
        <DisplayHeading size="md">
          Bientôt : <em className="italic text-gold-deep">événements & épinglés</em>
        </DisplayHeading>
        <p className="mt-2 text-sm text-muted-strong max-w-md leading-relaxed">
          Les RDV récurrents, les annonces de modos en haut de la page —
          dans la prochaine release.
        </p>
      </section>
    </div>
  );
}
