import { notFound, redirect } from "next/navigation";
import { CircleBotsView } from "../_components/CircleBotsView";
import { createClient } from "@/lib/supabase/server";
import { getCircleBySlug } from "@/lib/queries/circles";
import { listCircleBots } from "@/lib/queries/circleBots";

type Params = Promise<{ slug: string }>;

export const metadata = {
  title: "Bots du cercle",
};

export default async function CircleBotsPage({ params }: { params: Params }) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/circles/${slug}/bots`);

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();

  /* Admin/owner only. */
  if (circle.my_role !== "owner" && circle.my_role !== "admin") {
    redirect(`/circles/${slug}`);
  }

  const bots = await listCircleBots(circle.id);

  return (
    <CircleBotsView
      circleId={circle.id}
      circleSlug={circle.slug}
      initialBots={bots}
    />
  );
}
