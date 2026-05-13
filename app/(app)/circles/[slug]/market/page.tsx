import { Plus, Store } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { getCircleBySlug } from "@/lib/queries/circles";
import { listListings } from "@/lib/queries/listings";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ slug: string }>;

export const metadata = { title: "Marketplace du cercle" };

/* Onglet Marketplace v2 — annonces rattachées au cercle (listings.circle_id).
 * - CTA "Publier une annonce" pré-remplit le cercle via ?circle=<slug>
 * - Réutilise ListingCard du marketplace pour cohérence visuelle. */
export default async function CircleMarketTab({
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

  /* Si le module marketplace n'est pas activé, on bloque proprement. */
  if (circle.modules && !circle.modules.marketplace) {
    return (
      <div className="px-5 sm:px-8 py-10 text-center">
        <p className="text-[14px] text-night-dim">
          Le module marketplace n&apos;est pas activé pour ce cercle.
        </p>
      </div>
    );
  }

  const listings = await listListings(user.id, {
    circleId: circle.id,
    limit: 60,
  });

  return (
    <section className="px-4 sm:px-7 pb-8">
      <header className="px-1 sm:px-1 pb-4 flex items-baseline justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-gold-deep" aria-hidden />
          <KickerLabel>
            {listings.length} annonce{listings.length > 1 ? "s" : ""}
          </KickerLabel>
        </div>
        {circle.is_member ? (
          <Link
            href={`/marketplace/new?circle=${slug}`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-gradient-to-br from-gold to-gold-deep text-night text-[12px] font-extrabold shadow-[0_8px_22px_-10px_rgba(244,185,66,0.55)] hover:opacity-95 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden strokeWidth={2.5} />
            Publier une annonce
          </Link>
        ) : null}
      </header>

      {listings.length === 0 ? (
        <EmptyState
          emoji="🛍️"
          kicker="Marketplace vide"
          title={
            <>
              Aucune annonce dans{" "}
              <em className="italic text-gold-deep">{circle.name}</em>
            </>
          }
          body={
            circle.is_member
              ? "Sois le premier à publier une annonce thématique. Le cercle sera pré-rempli automatiquement."
              : "Rejoins le cercle pour publier une annonce."
          }
          ctaHref={
            circle.is_member
              ? `/marketplace/new?circle=${slug}`
              : `/circles/${slug}`
          }
          ctaLabel={circle.is_member ? "Publier la première" : "Rejoindre"}
          size="lg"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </section>
  );
}
