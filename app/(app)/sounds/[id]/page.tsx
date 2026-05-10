import { ArrowLeft, Music, Plus } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReelsGrid } from "@/components/reels/ReelsGrid";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { listReelsBySound } from "@/lib/queries/reels";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: sound } = await supabase
    .from("sounds")
    .select("title, artist")
    .eq("id", id)
    .maybeSingle();
  if (!sound) return { title: "Son introuvable" };
  return {
    title: `${sound.title} — ${sound.artist} · DIVARC Reels`,
    description: `Tous les reels qui utilisent "${sound.title}" de ${sound.artist}`,
  };
}

/* Page d'un son : disque animé + nom/artiste + bouton "Utiliser ce son"
 * + grid des reels qui l'utilisent (par popularité plays_count desc). */
export default async function SoundPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/sounds/${id}`);

  const { data: sound } = await supabase
    .from("sounds")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!sound) notFound();

  const reels = await listReelsBySound(id, user.id, 30);

  return (
    <div className="px-5 sm:px-8 py-6 max-w-4xl mx-auto">
      <Link
        href="/reels"
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
      >
        <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
        Retour aux reels
      </Link>

      {/* Header son. */}
      <header className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6 text-center sm:text-left">
        {/* Disque animé qui tourne. */}
        <div
          className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-night flex items-center justify-center shrink-0 animate-spin-slow border-4 border-line shadow-soft"
          aria-hidden
        >
          {sound.artwork_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={sound.artwork_url}
              alt=""
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover"
            />
          ) : (
            <Music className="w-10 h-10 text-cream/70" aria-hidden />
          )}
          <span className="absolute w-3 h-3 rounded-full bg-cream/30" />
        </div>

        <div className="min-w-0 flex-1">
          <DisplayHeading
            size="lg"
            className="!text-[28px] sm:!text-[36px] !leading-[1.1] truncate"
          >
            {sound.title}
          </DisplayHeading>
          <p className="mt-1.5 text-[14px] text-night-soft">{sound.artist}</p>
          <p className="mt-1 text-[11.5px] text-night-muted uppercase tracking-wider font-bold">
            {sound.usage_count.toLocaleString("fr-FR")}{" "}
            {sound.usage_count > 1 ? "reels" : "reel"} · {sound.source}
            {sound.is_explicit ? " · Explicit" : ""}
          </p>

          <div className="mt-3 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <Link
              href={`/reels/new?sound=${sound.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-night text-cream text-[13px] font-bold hover:bg-night/90"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden />
              Utiliser ce son
            </Link>
          </div>
        </div>
      </header>

      <section>
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> Reels populaires
        </h2>
        <ReelsGrid reels={reels} metric="plays" />
      </section>
    </div>
  );
}
