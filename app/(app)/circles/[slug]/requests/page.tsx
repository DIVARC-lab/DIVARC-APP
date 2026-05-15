import { notFound, redirect } from "next/navigation";
import { CircleRequestsView } from "../_components/CircleRequestsView";
import { createClient } from "@/lib/supabase/server";
import { getCircleBySlug } from "@/lib/queries/circles";
import {
  getMyCircleKarma,
  listCircleRequests,
} from "@/lib/queries/circleRequests";

/* Page board Demandes & Offres — Chantier Cercles v3 étape 4.
 *
 * Accessible aux membres actifs. Affiche la liste des annonces +
 * permet d'en créer une nouvelle (demande ou offre). */

type Params = Promise<{ slug: string }>;

export const metadata = {
  title: "Demandes & Offres",
};

export default async function CircleRequestsPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/circles/${slug}/requests`);

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();

  if (!circle.is_member || !circle.my_role) {
    redirect(`/circles/${slug}/about`);
  }

  const [requests, myKarma] = await Promise.all([
    listCircleRequests(circle.id, { status: "open" }),
    getMyCircleKarma(circle.id, user.id),
  ]);

  return (
    <CircleRequestsView
      circleId={circle.id}
      circleSlug={circle.slug}
      currentUserId={user.id}
      initialRequests={requests}
      myKarma={myKarma}
    />
  );
}
