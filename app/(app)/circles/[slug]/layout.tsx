import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Bell, Send, UserPlus } from "lucide-react";
import { getCircleBySlug } from "@/lib/queries/circles";
import { createClient } from "@/lib/supabase/server";
import { CircleHero } from "./_components/CircleHero";
import { CircleMembershipButton } from "./CircleMembershipButton";
import { CircleTabsNav } from "./_components/CircleTabsNav";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

/* Layout commun à tous les onglets du cercle : hero cover + identity +
 * actions + tabs sticky. Le contenu de chaque onglet est rendu par
 * children. Aucun fetch dupliqué — chaque page enfant refait son propre
 * fetch léger via getCircleBySlug si elle a besoin du cercle. */
export default async function CircleLayout({
  children,
  params,
}: LayoutProps) {
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
    isOwner ||
    circle.my_role === "admin" ||
    circle.my_role === "moderator" ||
    circle.my_role === "mod";

  return (
    <div className="bg-bg-soft min-h-[calc(100dvh-56px)] pb-24">
      <CircleHero
        circle={circle}
        actionsSlot={
          <div className="flex items-center gap-2 flex-wrap">
            <CircleMembershipButton
              circleId={circle.id}
              isMember={circle.is_member}
              isOwner={isOwner}
            />
            {circle.is_member && canModerate ? (
              <Link
                href={`/circles/${slug}/invite`}
                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-white border border-line text-night text-[12px] font-bold hover:border-night/30 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" aria-hidden />
                Inviter
              </Link>
            ) : null}
            {circle.is_member ? (
              <>
                <Link
                  href={`/circles/${slug}/notifications`}
                  aria-label="Notifications du cercle"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-line text-night-dim hover:text-night hover:border-night/30 transition-colors"
                >
                  <Bell className="w-3.5 h-3.5" aria-hidden />
                </Link>
                <Link
                  href={`/circles/${slug}/invite`}
                  aria-label="Partager"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-line text-night-dim hover:text-night hover:border-night/30 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden />
                </Link>
              </>
            ) : null}
          </div>
        }
      />

      <CircleTabsNav
        circleSlug={slug}
        modules={circle.modules ?? null}
        currentRole={circle.my_role}
      />

      <div className="mx-auto w-full max-w-2xl lg:max-w-5xl pt-4">
        {children}
      </div>
    </div>
  );
}
