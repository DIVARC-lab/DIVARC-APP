import { ArrowLeft, Eye, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { listMyActiveStories } from "@/lib/queries/stories";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/relativeTime";
import { Container } from "@/components/primitives/Container";

export const metadata = {
  title: "Mes stories",
};

const HOUR_MS = 3_600_000;

export default async function StoriesArchivePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const stories = await listMyActiveStories(user.id);

  /* now en ms calculé une seule fois pour éviter le call impur dans le
     render (React 19 strict). new Date() n'est pas marqué impure. */
  const nowMs = new Date().getTime();
  const totalViews = stories.reduce((sum, s) => sum + s.views_count, 0);
  const uniquePhoto = stories.filter((s) => s.type === "photo").length;
  const uniqueText = stories.filter((s) => s.type === "text").length;

  return (
    <Container maxWidth="default" paddingX="page" paddingY="3xl">
      <header className="mb-8">
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-4"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Retour au feed
        </Link>
        <KickerLabel>· Mes stories</KickerLabel>
        <DisplayHeading
          size="xl"
          italicAll
          className="mt-3 !leading-[1.05] !text-[40px] sm:!text-[54px]"
        >
          Archive ·{" "}
          <span className="not-italic font-display italic text-gold-deep">
            {stories.length} active{stories.length > 1 ? "s" : ""}
          </span>
        </DisplayHeading>
        <p className="mt-3 text-night-muted text-sm leading-relaxed max-w-md">
          Tes stories des dernières 24 h. Vues, expiration, suppression — tout
          ici.
        </p>
      </header>

      {/* Stats row */}
      <section
        aria-label="Statistiques"
        className="grid grid-cols-3 gap-3 sm:gap-4 mb-8"
      >
        <StatTile label="Vues" value={totalViews} />
        <StatTile label="Photos" value={uniquePhoto} />
        <StatTile label="Texte" value={uniqueText} />
      </section>

      {stories.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          kicker="Aucune story active"
          title={
            <>
              Tu n&apos;as pas de story <em className="italic text-gold-deep">en cours</em>
            </>
          }
          body="Publie une photo ou un mot pour 24 h. Tes amis verront un cercle doré dans leur feed."
          ctaHref="/stories/new"
          ctaLabel="Créer une story"
          tone="soft"
        />
      ) : (
        <ul className="space-y-3">
          {stories.map((story) => {
            const expiresAt = new Date(story.expires_at);
            const hoursLeft = Math.max(
              0,
              Math.round((expiresAt.getTime() - nowMs) / HOUR_MS),
            );
            return (
              <li key={story.id}>
                <ArchiveRow story={story} hoursLeft={hoursLeft} />
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white border border-line p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-display italic text-3xl text-night leading-none">
        {value}
      </p>
    </div>
  );
}

type ArchiveRowProps = {
  story: Awaited<ReturnType<typeof listMyActiveStories>>[number];
  hoursLeft: number;
};

function ArchiveRow({ story, hoursLeft }: ArchiveRowProps) {
  const isPhoto = story.type === "photo" && story.photo_url;
  const preview = story.caption ?? (isPhoto ? "Photo" : "Texte");

  return (
    <Link
      href={`/stories/${story.id}`}
      className="flex items-center gap-4 p-3 rounded-2xl bg-white border border-line hover:border-gold/40 hover:bg-gold/[0.02] transition-colors group"
    >
      <div
        className={cn(
          "relative w-14 h-20 rounded-xl overflow-hidden shrink-0 ring-2 ring-gold/40",
          !isPhoto &&
            "bg-gradient-to-br " +
              (story.background ??
                "from-night via-night-soft to-night-muted"),
        )}
      >
        {isPhoto ? (
          <Image
            src={story.photo_url!}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-1.5">
            <span className="font-display italic text-cream text-[10px] leading-tight text-center line-clamp-3">
              {story.caption}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-night truncate">
          {preview}
        </p>
        <p className="text-xs text-muted mt-0.5">
          {formatRelative(story.created_at)} · expire dans {hoursLeft} h
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-night-muted font-medium">
          <Eye className="w-3.5 h-3.5 text-gold-deep" aria-hidden />
          {story.views_count} vue{story.views_count > 1 ? "s" : ""}
        </div>
      </div>

      <span className="text-xs font-semibold text-gold-deep group-hover:text-night transition-colors">
        Ouvrir →
      </span>
    </Link>
  );
}
