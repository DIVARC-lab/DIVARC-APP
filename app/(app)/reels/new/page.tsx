import { redirect } from "next/navigation";
import { ReelCreator } from "@/components/reels/ReelCreator";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Créer un Reel — DIVARC",
};

type SearchParams = Promise<{ sound?: string }>;

/* Page de création d'un Reel.
 *
 * V1 : upload vidéo depuis galerie + description + audience + permissions.
 * V1.5 : capture caméra live, multi-clips, effets AR, édition timeline.
 *
 * ?sound=<sound_id> pré-sélectionne un son si présent (lancement depuis
 * /sounds/[id] "Utiliser ce son"). */
export default async function NewReelPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { sound } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/reels/new");

  /* Pré-charge le son si fourni en query. */
  let preselectedSound = null;
  if (sound) {
    const { data } = await supabase
      .from("sounds")
      .select("id, title, artist, audio_url")
      .eq("id", sound)
      .maybeSingle();
    preselectedSound = data ?? null;
  }

  return <ReelCreator userId={user.id} preselectedSound={preselectedSound} />;
}
