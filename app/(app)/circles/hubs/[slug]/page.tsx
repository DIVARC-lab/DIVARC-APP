import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/server";
import {
  aggregateHubFeed,
  getHubBySlug,
  listHubCircles,
} from "@/lib/queries/circleHubs";
import { formatRelative } from "@/lib/utils/relativeTime";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const hub = await getHubBySlug(slug);
  return {
    title: hub ? `Hub ${hub.name}` : "Hub",
  };
}

export default async function HubDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/circles/hubs/${slug}`);

  const hub = await getHubBySlug(slug);
  if (!hub) notFound();

  const [circles, feed] = await Promise.all([
    listHubCircles(hub.id),
    aggregateHubFeed(hub.id, 20),
  ]);

  const isOwner = hub.owner_id === user.id;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-4xl mx-auto">
      <Link
        href="/circles/hubs"
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
        Tous les hubs
      </Link>

      {/* Hero */}
      <header className="flex items-start gap-4">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shrink-0"
          style={{
            background: `${hub.color_accent}15`,
            color: hub.color_accent,
          }}
        >
          {hub.emoji ?? hub.name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display italic text-3xl text-night">
            {hub.name}
          </h1>
          {hub.tagline ? (
            <p className="text-[14px] text-night-muted mt-1">{hub.tagline}</p>
          ) : null}
          <div className="flex items-center gap-3 mt-3 text-[12px] text-night-muted">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" aria-hidden />
              {hub.circles_count} cercle{hub.circles_count > 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" aria-hidden />
              {hub.members_aggregate.toLocaleString("fr-FR")} membres au total
            </span>
            {hub.primary_category ? (
              <span className="px-2 h-5 inline-flex items-center rounded-full bg-night/5 text-[10px] font-bold uppercase tracking-[0.08em]">
                {hub.primary_category}
              </span>
            ) : null}
          </div>
          {hub.description ? (
            <p className="text-[13.5px] text-night/80 leading-relaxed mt-3 max-w-prose">
              {hub.description}
            </p>
          ) : null}
        </div>
      </header>

      {/* Cercles du hub */}
      <section>
        <h2 className="text-sm font-bold text-night uppercase tracking-wider mb-3">
          Cercles du hub ({circles.length})
        </h2>
        {circles.length === 0 ? (
          <p className="text-[13px] text-night-muted italic">
            Aucun cercle pour l&apos;instant.{" "}
            {isOwner
              ? "Invite les cercles qui te paraissent pertinents à rejoindre ce hub."
              : "Reviens plus tard ou propose ton cercle pour rejoindre."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {circles.map((c) => (
              <Link
                key={c.id}
                href={`/circles/${c.slug}`}
                className="block bg-white border border-line rounded-2xl p-4 hover:border-night/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-night/5 flex items-center justify-center text-2xl shrink-0">
                    {c.emoji ?? c.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-bold text-night truncate">
                      {c.name}
                    </h3>
                    {c.tagline ? (
                      <p className="text-[11px] text-night-muted line-clamp-1">
                        {c.tagline}
                      </p>
                    ) : null}
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-night-muted">
                      <span>{c.members_count} membres</span>
                      <span>·</span>
                      <span>Vitality {Math.round(c.vitality_score)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Feed cross-cercles */}
      <section>
        <h2 className="text-sm font-bold text-night uppercase tracking-wider mb-3">
          Feed agrégé
        </h2>
        {feed.length === 0 ? (
          <p className="text-[13px] text-night-muted italic">
            Aucun post pour l&apos;instant dans les cercles du hub.
          </p>
        ) : (
          <div className="space-y-3">
            {feed.map((post) => (
              <article
                key={post.post_id}
                className="bg-white border border-line rounded-2xl p-4"
              >
                <header className="flex items-center gap-2 mb-2">
                  <Link
                    href={`/circles/${post.circle_slug}`}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gold/10 text-gold-deep text-[10px] font-bold hover:bg-gold/20"
                  >
                    {post.circle_emoji ?? "#"}{" "}
                    {post.circle_name}
                  </Link>
                  <span className="text-[10px] text-night-muted">
                    {formatRelative(post.created_at)}
                  </span>
                </header>
                <Link
                  href={`/feed/${post.post_id}`}
                  className="block text-[14px] text-night leading-relaxed hover:underline line-clamp-3"
                >
                  {post.body}
                </Link>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-night-muted">
                  <span>❤ {post.likes_count}</span>
                  <span>💬 {post.comments_count}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
