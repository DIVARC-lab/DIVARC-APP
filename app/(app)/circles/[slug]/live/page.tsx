import { notFound, redirect } from "next/navigation";
import { CircleLiveRoomsView } from "../_components/CircleLiveRoomsView";
import { createClient } from "@/lib/supabase/server";
import { getCircleBySlug } from "@/lib/queries/circles";
import { listCircleLiveRooms } from "@/lib/queries/circleLiveRooms";

type Params = Promise<{ slug: string }>;

export const metadata = {
  title: "Salles Live",
};

export default async function CircleLivePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/circles/${slug}/live`);

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();
  if (!circle.is_member || !circle.my_role) {
    redirect(`/circles/${slug}/about`);
  }

  const rooms = await listCircleLiveRooms(circle.id);

  return (
    <CircleLiveRoomsView
      circleId={circle.id}
      circleSlug={circle.slug}
      myRole={circle.my_role}
      currentUserId={user.id}
      initialRooms={rooms}
    />
  );
}
