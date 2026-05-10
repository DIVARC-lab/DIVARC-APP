import { redirect } from "next/navigation";
import { ReelsFeed } from "@/components/reels/ReelsFeed";
import { listForYouReels, listFollowingReels } from "@/lib/queries/reels";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Reels — DIVARC",
};

type SearchParams = Promise<{ tab?: "foryou" | "following" }>;

/* Page principale Reels — feed vertical fullscreen.
 *
 * Sources :
 *   - tab=foryou (default) : algo recsys (V1 = récents publics
 *     non vus + diversification créateur)
 *   - tab=following : reels des comptes suivis uniquement
 *
 * Le layout parent gère le fond noir + suppression du chrome.
 */
export default async function ReelsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { tab } = await searchParams;
  const initialTab = tab === "following" ? "following" : "foryou";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/reels");

  /* Fetch initial des 2 onglets en parallèle pour SSR rapide. */
  const [foryouReels, followingReels] = await Promise.all([
    listForYouReels(user.id, 12),
    listFollowingReels(user.id, 12),
  ]);

  return (
    <ReelsFeed
      currentUserId={user.id}
      initialTab={initialTab}
      foryouReels={foryouReels}
      followingReels={followingReels}
    />
  );
}
