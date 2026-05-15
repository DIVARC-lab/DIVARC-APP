import { notFound, redirect } from "next/navigation";
import { CircleChatView } from "../_components/CircleChatView";
import { createClient } from "@/lib/supabase/server";
import { getCircleBySlug } from "@/lib/queries/circles";
import { listCircleChatMessages } from "@/lib/queries/circleChat";

/* Page Chat de groupe du cercle — Chantier Cercles v3 étape 1.
 *
 * SSR : auth + check membre actif + chargement des 50 derniers messages
 * (ordre chrono ASC pour affichage). Le composant client gère ensuite
 * la subscription Supabase Realtime, le composer, les threads, etc. */

type Params = Promise<{ slug: string }>;

export const metadata = {
  title: "Chat",
};

export default async function CircleChatPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/circles/" + slug + "/chat");

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();

  /* Check membre. Si pas membre du tout, redirige vers about pour join.
     Note : my_role peut être null si l'invitation est en attente — on
     accepte les rôles actifs uniquement (owner/admin/mod/etc). */
  if (!circle.is_member || !circle.my_role) {
    redirect(`/circles/${slug}/about`);
  }

  const initialMessages = await listCircleChatMessages(circle.id, {
    limit: 50,
  });

  /* Profil courant pour le composer (avatar + nom). */
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <CircleChatView
      circleId={circle.id}
      circleSlug={circle.slug}
      circleName={circle.name}
      currentUserId={user.id}
      currentUserProfile={profile}
      initialMessages={initialMessages}
    />
  );
}
