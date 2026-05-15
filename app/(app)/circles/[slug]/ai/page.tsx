import { notFound, redirect } from "next/navigation";
import { CircleAIAssistantView } from "../_components/CircleAIAssistantView";
import { createClient } from "@/lib/supabase/server";
import { getCircleBySlug } from "@/lib/queries/circles";

type Params = Promise<{ slug: string }>;

export const metadata = {
  title: "Assistant IA",
};

export default async function CircleAIPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/circles/${slug}/ai`);

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();
  if (!circle.is_member || !circle.my_role) {
    redirect(`/circles/${slug}/about`);
  }

  return (
    <CircleAIAssistantView
      circleId={circle.id}
      circleSlug={circle.slug}
    />
  );
}
