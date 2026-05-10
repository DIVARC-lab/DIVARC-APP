import { redirect } from "next/navigation";
import { ReelCreator } from "@/components/reels/ReelCreator";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Créer un Reel — DIVARC",
};

type SearchParams = Promise<{
  sound?: string;
  duet?: string;
  layout?: string;
}>;

/* Page de création d'un Reel.
 *
 * Query params :
 *   - ?sound=<id> : pré-sélectionne un son
 *   - ?duet=<reel_id>&layout=<right|left|top|bottom> : mode Duo (V3.8) */
export default async function NewReelPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { sound, duet, layout } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/reels/new");

  /* Pré-charge le son si fourni. */
  let preselectedSound = null;
  if (sound) {
    const { data } = await supabase
      .from("sounds")
      .select("id, title, artist, audio_url")
      .eq("id", sound)
      .maybeSingle();
    preselectedSound = data ?? null;
  }

  /* Pré-charge la source du duet si fournie. Filtre allow_duets. */
  let duetSource = null;
  if (duet) {
    const { data: source } = await supabase
      .from("reels")
      .select("id, video_url, video_mp4_fallback, allow_duets, audience")
      .eq("id", duet)
      .is("deleted_at", null)
      .maybeSingle();
    if (source && source.allow_duets && source.audience === "public") {
      const allowedLayouts = ["right", "left", "top", "bottom"] as const;
      type AllowedLayout = (typeof allowedLayouts)[number];
      const safeLayout: AllowedLayout = (allowedLayouts as readonly string[]).includes(
        layout ?? "",
      )
        ? (layout as AllowedLayout)
        : "right";
      duetSource = {
        reelId: source.id,
        videoUrl: source.video_url,
        videoMp4Fallback: source.video_mp4_fallback,
        layout: safeLayout,
      };
    }
  }

  return (
    <ReelCreator
      userId={user.id}
      preselectedSound={preselectedSound}
      duetSource={duetSource}
    />
  );
}
