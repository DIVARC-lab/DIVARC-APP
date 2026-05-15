import { notFound, redirect } from "next/navigation";
import { CircleChannelsView } from "../_components/CircleChannelsView";
import { createClient } from "@/lib/supabase/server";
import { getCircleBySlug } from "@/lib/queries/circles";
import { listCircleChannels } from "@/lib/queries/circleChannels";

type Params = Promise<{ slug: string }>;

export const metadata = {
  title: "Channels du cercle",
};

/* Page admin /circles/[slug]/channels — gestion des channels (création,
 * rename, type announcement/forum/text, archive, reorder).
 * Réservée aux owner + admin. */
export default async function CircleChannelsPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/circles/${slug}/channels`);

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();

  if (circle.my_role !== "owner" && circle.my_role !== "admin") {
    redirect(`/circles/${slug}`);
  }

  const channels = await listCircleChannels(circle.id);

  return (
    <CircleChannelsView
      circleId={circle.id}
      circleSlug={circle.slug}
      initialChannels={channels}
    />
  );
}
