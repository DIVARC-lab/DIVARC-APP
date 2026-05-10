import { ArrowLeft, Video } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReelsGrid } from "@/components/reels/ReelsGrid";
import { Avatar } from "@/components/ui/Avatar";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { listReelsByUser } from "@/lib/queries/reels";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { username } = await params;
  return {
    title: `Reels de @${username} — DIVARC`,
  };
}

/* Profil reels d'un user : grid 3 cols mobile / 4 cols desktop. */
export default async function UserReelsPage({
  params,
}: {
  params: Params;
}) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/u/${username}/reels`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, bio")
    .eq("username", username)
    .maybeSingle();
  if (!profile) notFound();

  const reels = await listReelsByUser(profile.id, user.id, 60);
  const totalViews = reels.reduce((acc, r) => acc + r.views_count, 0);
  const totalLikes = reels.reduce((acc, r) => acc + r.likes_count, 0);

  return (
    <div className="px-5 sm:px-8 py-6 max-w-4xl mx-auto">
      <Link
        href={`/u/${username}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
      >
        <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
        Profil
      </Link>

      <header className="flex items-center gap-3 mb-6">
        <Avatar
          src={profile.avatar_url}
          fullName={profile.full_name}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <DisplayHeading
            size="lg"
            className="!text-[24px] sm:!text-[30px] !leading-[1.1]"
          >
            <Video
              className="inline w-5 h-5 mr-2 text-gold-deep"
              aria-hidden
            />
            Reels de {profile.full_name ?? `@${profile.username}`}
          </DisplayHeading>
          <p className="mt-1 text-[12.5px] text-night-soft">
            {reels.length} {reels.length > 1 ? "reels" : "reel"} ·{" "}
            {totalViews.toLocaleString("fr-FR")} vues ·{" "}
            {totalLikes.toLocaleString("fr-FR")} likes
          </p>
        </div>
      </header>

      <ReelsGrid reels={reels} metric="views" />
    </div>
  );
}
