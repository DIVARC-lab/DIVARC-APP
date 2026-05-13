import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import {
  getCircleAmbassadorReward,
  getCircleBySlug,
} from "@/lib/queries/circles";
import { listCircleInvitations } from "@/lib/queries/circle_invitations";
import { createClient } from "@/lib/supabase/server";
import { AmbassadorProgress } from "./AmbassadorProgress";
import { CircleInvitationsManager } from "./CircleInvitationsManager";

export const metadata = {
  title: "Invitations",
};

type Params = Promise<{ slug: string }>;

export default async function CircleInvitePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();

  const isOwner = circle.owner_id === user.id;
  const canModerate =
    isOwner || circle.my_role === "admin" || circle.my_role === "mod";
  if (!canModerate) {
    redirect(`/circles/${slug}`);
  }

  const [invitations, ambassador] = await Promise.all([
    listCircleInvitations(circle.id),
    getCircleAmbassadorReward(user.id, circle.id),
  ]);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-2xl mx-auto w-full">
      <header className="mb-8">
        <Link
          href={`/circles/${slug}`}
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-4"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          {circle.name}
        </Link>
        <KickerLabel>Invitations</KickerLabel>
        <DisplayHeading size="lg" className="mt-2">
          Élargis le <em className="italic text-gold-deep">cercle</em>.
        </DisplayHeading>
        <p className="mt-2 text-muted-strong">
          {circle.is_private
            ? "Les invitations sont indispensables pour rejoindre ce cercle privé."
            : "Génère un lien à partager. Optionnel : limite d'usages, expiration."}
        </p>
      </header>

      <AmbassadorProgress reward={ambassador} circleName={circle.name} />

      <CircleInvitationsManager
        circleId={circle.id}
        invitations={invitations}
        circleName={circle.name}
      />
    </div>
  );
}
