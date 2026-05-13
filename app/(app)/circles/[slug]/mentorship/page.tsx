import { GraduationCap, Plus } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { getCircleBySlug } from "@/lib/queries/circles";
import { createClient } from "@/lib/supabase/server";
import type { CircleMentorOffer } from "@/lib/database.types";
import { MentorCard } from "./_components/MentorCard";
import { MentorOfferComposer } from "./_components/MentorOfferComposer";

type Params = Promise<{ slug: string }>;

export const metadata = { title: "Mentorat — Cercle" };

export default async function CircleMentorshipTab({
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

  if (circle.modules && !circle.modules.mentorship) {
    return (
      <div className="px-5 sm:px-8 py-10 text-center">
        <p className="text-[14px] text-night-dim">
          Le module Mentorat n&apos;est pas activé pour ce cercle.
        </p>
      </div>
    );
  }

  /* Liste des offres ouvertes du cercle + l'offre de l'user (si existe). */
  const { data: offers } = await supabase
    .from("circle_mentor_offers")
    .select("*")
    .eq("circle_id", circle.id)
    .order("is_open", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  const offerList = (offers ?? []) as CircleMentorOffer[];

  const myOffer = offerList.find((o) => o.mentor_user_id === user.id) ?? null;
  const otherOffers = offerList.filter(
    (o) => o.mentor_user_id !== user.id,
  );

  /* Profiles des mentors. */
  const mentorIds = Array.from(
    new Set(offerList.map((o) => o.mentor_user_id)),
  );
  const { data: profiles } =
    mentorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", mentorIds)
      : { data: [] };
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  return (
    <section className="px-5 sm:px-8 pb-10">
      <header className="pb-4 flex items-baseline justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-gold-deep" aria-hidden />
          <KickerLabel>
            {otherOffers.filter((o) => o.is_open).length} mentor
            {otherOffers.filter((o) => o.is_open).length > 1 ? "s" : ""}{" "}
            disponibles
          </KickerLabel>
        </div>
      </header>

      <p className="text-[12px] text-night-dim mb-5 max-w-prose">
        Le mentorat dans ce cercle se fait entre membres. Si tu as de
        l&apos;expérience à partager, propose-toi. Si tu cherches un mentor,
        contacte-en un.
      </p>

      {/* Ma propre offre (si membre) */}
      {circle.is_member ? (
        <div className="mb-6 rounded-2xl bg-bg-soft border border-line p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gold-deep mb-2">
            · Ton offre de mentor
          </p>
          <MentorOfferComposer
            circleId={circle.id}
            initial={myOffer}
          />
        </div>
      ) : null}

      {/* Liste des autres mentors */}
      {otherOffers.length === 0 ? (
        <EmptyState
          emoji="🧭"
          kicker="Pas encore de mentor"
          title={
            <>
              Aucun mentor déclaré dans{" "}
              <em className="italic text-gold-deep">{circle.name}</em>
            </>
          }
          body={
            circle.is_member
              ? "Propose-toi en premier ci-dessus."
              : "Rejoins le cercle pour participer au mentorat."
          }
          size="lg"
        />
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {otherOffers.map((offer) => (
            <li key={offer.id}>
              <MentorCard
                offer={offer}
                profile={profileMap.get(offer.mentor_user_id) ?? null}
                circleSlug={slug}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex items-center gap-1.5 text-[11px] text-night-dim">
        <Plus className="w-3 h-3" aria-hidden />
        Le matching mentor/mentee passe par la messagerie marketplace dédiée
        au cercle.
      </div>
    </section>
  );
}
