import { ArrowLeft, Bell } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCircleBySlug } from "@/lib/queries/circles";
import { createClient } from "@/lib/supabase/server";
import type { CircleNotificationPreferences } from "@/lib/database.types";
import { NotificationPrefsForm } from "./_components/NotificationPrefsForm";

type Params = Promise<{ slug: string }>;

export const metadata = { title: "Notifications du cercle" };

const DEFAULT_PREFS: CircleNotificationPreferences = {
  new_posts: "highlights",
  new_marketplace: "matching_interests",
  new_jobs: "matching_profile",
  new_events: "all",
  mentions: true,
  direct_replies: true,
  moderator_messages: true,
  weekly_digest: true,
};

export default async function CircleNotificationsPage({
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
  if (!circle.is_member) {
    return (
      <div className="px-5 sm:px-8 py-10 text-center">
        <p className="text-[14px] text-night-dim">
          Tu dois être membre pour configurer les notifications.
        </p>
      </div>
    );
  }

  const { data: member } = await supabase
    .from("circle_members")
    .select("notifications")
    .eq("circle_id", circle.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const prefs =
    ((member as { notifications?: CircleNotificationPreferences } | null)
      ?.notifications) ?? DEFAULT_PREFS;

  /* Merge avec defaults pour les clés absentes (migration partielle). */
  const initial: CircleNotificationPreferences = {
    new_posts: prefs.new_posts ?? DEFAULT_PREFS.new_posts,
    new_marketplace: prefs.new_marketplace ?? DEFAULT_PREFS.new_marketplace,
    new_jobs: prefs.new_jobs ?? DEFAULT_PREFS.new_jobs,
    new_events: prefs.new_events ?? DEFAULT_PREFS.new_events,
    mentions: prefs.mentions ?? DEFAULT_PREFS.mentions,
    direct_replies: prefs.direct_replies ?? DEFAULT_PREFS.direct_replies,
    moderator_messages:
      prefs.moderator_messages ?? DEFAULT_PREFS.moderator_messages,
    weekly_digest: prefs.weekly_digest ?? DEFAULT_PREFS.weekly_digest,
  };

  return (
    <div className="px-5 sm:px-8 pb-10">
      <Link
        href={`/circles/${slug}`}
        className="inline-flex items-center gap-1.5 text-[12px] text-night-dim hover:text-night mb-3"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
        Retour au cercle
      </Link>
      <header className="mb-4 flex items-center gap-2">
        <Bell className="w-4 h-4 text-gold-deep" aria-hidden />
        <h1 className="text-[15px] sm:text-[17px] font-bold text-night">
          Notifications de {circle.name}
        </h1>
      </header>
      <p className="text-[12px] text-night-dim mb-5 max-w-prose">
        Tu décides ce que tu veux recevoir, à quelle fréquence. Ces préférences
        ne s&apos;appliquent qu&apos;à ce cercle.
      </p>

      <NotificationPrefsForm circleId={circle.id} initial={initial} />

      <p className="mt-5 text-[10.5px] text-night-dim text-center">
        Tu peux aussi choisir de quitter le cercle à tout moment depuis
        l&apos;onglet À propos.
      </p>
    </div>
  );
}
