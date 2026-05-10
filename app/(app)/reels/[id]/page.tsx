import { notFound, redirect } from "next/navigation";
import { ReelsFeed } from "@/components/reels/ReelsFeed";
import {
  getReel,
  listForYouReels,
} from "@/lib/queries/reels";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const reel = await getReel(id, user?.id ?? null);
  return {
    title: reel
      ? `${reel.author?.full_name ?? "Reel"} sur DIVARC`
      : "Reel introuvable",
    description: reel?.description ?? undefined,
  };
}

/* Deep-link vers un reel précis. On l'ouvre comme premier reel du
 * feed, suivi des autres reels For You pour permettre le swipe. */
export default async function ReelDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/reels/${id}`);

  const target = await getReel(id, user.id);
  if (!target) notFound();

  /* Fetch des autres reels (For You) excluant le reel courant. */
  const others = await listForYouReels(user.id, 11);
  const otherFiltered = others.filter((r) => r.id !== id);

  return (
    <ReelsFeed
      currentUserId={user.id}
      initialTab="foryou"
      foryouReels={[target, ...otherFiltered]}
      followingReels={[]}
    />
  );
}
