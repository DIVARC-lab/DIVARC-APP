import { Hash, TrendingUp, UserPlus, Users2 } from "lucide-react";
import Link from "next/link";
import { ArcMark } from "@/components/marketing/ArcMark";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { KickerLabel } from "@/components/ui/KickerLabel";
import type { Hashtag } from "@/lib/database.types";
import type { ExplorePerson } from "@/lib/queries/explore";

type FeedRightRailProps = {
  suggestions: ExplorePerson[];
  trendingTags: Hashtag[];
};

/** Right rail visible at lg+ on /feed.
 *  - Suggestions à suivre (3 personnes)
 *  - Tendances cette semaine (top 5 hashtags)
 *  - Carte "Ce soir" (event evergreen, navy + gold) */
export function FeedRightRail({
  suggestions,
  trendingTags,
}: FeedRightRailProps) {
  return (
    <aside className="hidden lg:flex flex-col gap-4 sticky top-6 self-start max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">
      {suggestions.length > 0 ? (
        <SuggestionsCard suggestions={suggestions.slice(0, 4)} />
      ) : null}

      {trendingTags.length > 0 ? (
        <TrendsCard tags={trendingTags.slice(0, 6)} />
      ) : null}

      <FoundersCard />
    </aside>
  );
}

function SuggestionsCard({ suggestions }: { suggestions: ExplorePerson[] }) {
  return (
    <article className="rounded-3xl bg-white border border-line p-5 shadow-soft">
      <KickerLabel>Suggestions</KickerLabel>
      <h3 className="mt-1 mb-3 font-display italic text-xl text-night leading-none">
        À suivre
      </h3>
      <ul className="flex flex-col gap-3">
        {suggestions.map((person) => {
          const displayName =
            person.full_name ?? person.username ?? "Utilisateur";
          return (
            <li
              key={person.id}
              className="flex items-center gap-3"
            >
              <Link
                href={`/u/${person.username ?? ""}`}
                className="shrink-0"
              >
                <Avatar
                  src={person.avatar_url}
                  fullName={displayName}
                  size="md"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/u/${person.username ?? ""}`}
                  className="block text-sm font-semibold text-night truncate hover:underline"
                >
                  {displayName}
                </Link>
                <p className="text-xs text-muted truncate">
                  {person.location ?? `@${person.username ?? ""}`}
                </p>
              </div>
              <Button asChild size="sm" variant="secondary">
                <Link href={`/u/${person.username ?? ""}`}>
                  <UserPlus className="w-3.5 h-3.5" aria-hidden />
                  Voir
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>
      <Link
        href="/explore"
        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-gold-deep hover:underline"
      >
        Voir plus <Users2 className="w-3 h-3" aria-hidden />
      </Link>
    </article>
  );
}

function TrendsCard({ tags }: { tags: Hashtag[] }) {
  return (
    <article className="rounded-3xl bg-cream border border-gold/30 p-5">
      <KickerLabel>Tendances</KickerLabel>
      <h3 className="mt-1 mb-3 font-display italic text-xl text-night leading-none">
        Cette semaine
      </h3>
      <ul className="flex flex-col gap-2.5">
        {tags.map((tag, idx) => (
          <li key={tag.id}>
            <Link
              href={`/feed/tag/${encodeURIComponent(tag.tag)}`}
              className="flex items-center justify-between gap-2 text-sm font-semibold text-night group"
            >
              <span className="inline-flex items-center gap-2 min-w-0">
                <span className="w-5 text-[10px] font-extrabold text-gold-deep tabular-nums">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="inline-flex items-center gap-0.5 group-hover:underline truncate">
                  <Hash className="w-3.5 h-3.5 text-gold-deep shrink-0" aria-hidden />
                  {tag.tag}
                </span>
              </span>
              <span className="text-[11px] text-muted font-medium shrink-0">
                {tag.posts_count} post{tag.posts_count > 1 ? "s" : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/explore"
        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-gold-deep hover:underline"
      >
        Tendances complètes <TrendingUp className="w-3 h-3" aria-hidden />
      </Link>
    </article>
  );
}

function FoundersCard() {
  return (
    <article className="rounded-3xl bg-night text-cream p-5 shadow-soft relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -right-10 -bottom-10 opacity-40 pointer-events-none"
      >
        <ArcMark size={180} animate={false} />
      </div>
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold">
          · Beta privée
        </span>
        <h3 className="mt-2 font-display italic text-xl leading-tight text-cream">
          Tu fais partie des fondateurs.
        </h3>
        <p className="mt-2 text-xs text-cream/70 leading-relaxed">
          Ton avis compte directement dans la roadmap. Réponds aux sondages
          internes pour façonner DIVARC.
        </p>
        <Button
          asChild
          size="sm"
          className="mt-3 !bg-gold !text-night hover:!bg-gold-soft"
        >
          <Link href="/profile?tab=journal">Mon parcours</Link>
        </Button>
      </div>
    </article>
  );
}
