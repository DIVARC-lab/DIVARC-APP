import { Calendar } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { getCircleBySlug } from "@/lib/queries/circles";
import { listUpcomingCircleEvents } from "@/lib/queries/circle_events";
import { createClient } from "@/lib/supabase/server";
import { CircleEventsSection } from "../CircleEventsSection";

type Params = Promise<{ slug: string }>;

export const metadata = { title: "Événements du cercle" };

export default async function CircleEventsTab({
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

  const events = await listUpcomingCircleEvents(circle.id, user.id, 30);

  return (
    <section className="px-5 sm:px-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gold-deep" aria-hidden />
          <KickerLabel>À venir</KickerLabel>
        </div>
        {circle.is_member ? (
          <Link
            href={`/circles/${slug}/events/new`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-night text-cream text-[12px] font-bold hover:bg-night-soft transition-colors"
          >
            + Créer un événement
          </Link>
        ) : null}
      </div>

      <CircleEventsSection
        circleSlug={slug}
        events={events}
        isMember={circle.is_member}
      />
    </section>
  );
}
