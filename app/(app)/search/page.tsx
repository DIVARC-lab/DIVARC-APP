import { History, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { suggestPeople } from "@/lib/queries/explore";
import { listTrendingHashtags } from "@/lib/queries/hashtags";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import { Container } from "@/components/primitives/Container";

export const metadata = {
  title: "Recherche",
};

const RECENT_PLACEHOLDERS = [
  "atelier photo dakar",
  "mariam diop",
  "jobs dev react",
  "marché plateau",
];

export default async function SearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [trends, suggestions] = await Promise.all([
    listTrendingHashtags(8),
    suggestPeople(user.id, 6),
  ]);

  return (
    <Container maxWidth="default" paddingX="page" paddingY="3xl">
      {/* Search bar (visual — real input lives in components/GlobalSearch) */}
      <header className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-11 rounded-full bg-white border border-line flex items-center gap-2.5 px-4 text-sm text-muted-strong">
          <Search className="w-4 h-4 text-night-muted" aria-hidden />
          <span className="truncate">Rechercher amis, posts, lieux…</span>
        </div>
        <Link
          href="/feed"
          className="text-sm font-semibold text-night-muted hover:text-night transition-colors"
        >
          Annuler
        </Link>
      </header>

      <nav
        aria-label="Filtres recherche"
        className="-mx-1 px-1 mb-7 flex gap-2 overflow-x-auto scrollbar-none"
      >
        {[
          { l: "Tout", active: true },
          { l: "Personnes" },
          { l: "Posts" },
          { l: "Marché" },
          { l: "Jobs" },
          { l: "Lieux" },
        ].map((f) => (
          <span
            key={f.l}
            className={cn(
              "shrink-0 px-3.5 h-8 rounded-full text-xs font-semibold inline-flex items-center transition-colors",
              f.active
                ? "bg-night text-cream"
                : "bg-white border border-line text-night-muted",
            )}
          >
            {f.l}
          </span>
        ))}
      </nav>

      {/* Tendances cette semaine */}
      <section className="mb-8">
        <KickerLabel>· Tendances</KickerLabel>
        <DisplayHeading
          size="lg"
          italicAll
          className="mt-2 mb-4 !leading-[1.05]"
        >
          Cette semaine
        </DisplayHeading>
        {trends.length === 0 ? (
          <p className="text-sm text-muted">
            Pas encore de tendance. Reviens demain.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {trends.slice(0, 4).map((tag, idx) => (
              <li key={tag.id}>
                <Link
                  href={`/feed/tag/${encodeURIComponent(tag.tag)}`}
                  className={cn(
                    "block rounded-2xl p-4 border transition-colors",
                    idx % 2 === 1
                      ? "bg-cream border-gold/30 hover:border-gold/60"
                      : "bg-white border-line hover:border-gold/40",
                  )}
                >
                  <p className="text-[11px] text-muted font-semibold tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </p>
                  <p className="font-display italic text-lg text-night mt-1 leading-tight truncate">
                    #{tag.tag}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    {tag.posts_count} post{tag.posts_count > 1 ? "s" : ""} cette
                    semaine
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* À découvrir : personnes près de toi */}
      <section className="mb-8">
        <KickerLabel>· À découvrir</KickerLabel>
        <DisplayHeading
          size="lg"
          italicAll
          className="mt-2 mb-4 !leading-[1.05]"
        >
          Personnes près de toi
        </DisplayHeading>
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted">Aucune suggestion pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-2">
            {suggestions.slice(0, 5).map((person) => {
              const displayName =
                person.full_name ?? person.username ?? "Utilisateur";
              return (
                <li key={person.id}>
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-line">
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
                        {person.location
                          ? `À ${person.location}`
                          : `@${person.username ?? ""}`}
                      </p>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/u/${person.username ?? ""}`}>
                        <UserPlus className="w-3.5 h-3.5" aria-hidden />
                        Suivre
                      </Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Recherches récentes (placeholder, future : persistance par user) */}
      <section>
        <KickerLabel>· Recherches récentes</KickerLabel>
        <ul className="mt-3">
          {RECENT_PLACEHOLDERS.map((q, idx) => (
            <li
              key={q}
              className={cn(
                "flex items-center gap-3 py-3",
                idx < RECENT_PLACEHOLDERS.length - 1 && "border-b border-line",
              )}
            >
              <History className="w-4 h-4 text-muted shrink-0" aria-hidden />
              <span className="flex-1 text-sm text-night truncate">{q}</span>
              <span className="text-xs text-muted">↗</span>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
