import { ArrowLeft, Handshake, Inbox, Send } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { EmptyState } from "@/components/ui/EmptyState";
import { listMyOffers } from "@/lib/queries/listingOffers";
import { createClient } from "@/lib/supabase/server";
import { OfferCard } from "./_components/OfferCard";

export const metadata = {
  title: "Mes offres",
};

type SearchParams = Promise<{ tab?: string }>;

export default async function OffersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { tab } = await searchParams;
  const activeTab = tab === "sent" ? "sent" : "received";

  const offers = await listMyOffers(user.id, activeTab);
  const pendingCount = offers.filter((o) => o.status === "pending").length;

  return (
    <div className="bg-bg-soft min-h-screen pb-24">
      <div className="mx-auto w-full max-w-2xl lg:max-w-3xl">
        {/* Hero header — grammaire Bold cohérente */}
        <header className="relative overflow-hidden bg-gradient-to-b from-cream to-bg-soft px-5 sm:px-8 pt-8 sm:pt-10 pb-6">
          <div
            aria-hidden
            className="absolute -right-12 -top-14 opacity-45 pointer-events-none"
          >
            <ArcDeco size={220} tone="gold" opacity={1} stroke={1.25} />
          </div>
          <div className="relative">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
            >
              <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
              Marketplace
            </Link>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
              · Négociation
            </p>
            <h1 className="mt-2 font-display text-[36px] sm:text-[44px] font-normal leading-[1.05] tracking-[-0.02em] text-night text-balance">
              Tes{" "}
              <em className="italic bg-gradient-to-br from-gold to-[#B88A2A] bg-clip-text text-transparent">
                offres
              </em>
              .
            </h1>
            <p className="mt-2 text-[13px] text-night-soft">
              {offers.length} offre{offers.length > 1 ? "s" : ""}
              {pendingCount > 0 ? ` · ${pendingCount} en attente` : ""}
            </p>
          </div>
        </header>

        {/* Tabs reçues / envoyées */}
        <nav
          aria-label="Filtre offres"
          className="px-4 sm:px-7 pt-5 flex gap-2"
        >
          <Link
            href="/marketplace/offers"
            aria-current={activeTab === "received" ? "page" : undefined}
            className={
              activeTab === "received"
                ? "inline-flex items-center gap-1.5 h-11 px-4 rounded-full text-[12px] font-bold bg-night text-cream"
                : "inline-flex items-center gap-1.5 h-11 px-4 rounded-full text-[12px] font-bold bg-white border border-line text-night-soft hover:border-night/30"
            }
          >
            <Inbox className="w-3.5 h-3.5" aria-hidden />
            Reçues
          </Link>
          <Link
            href="/marketplace/offers?tab=sent"
            aria-current={activeTab === "sent" ? "page" : undefined}
            className={
              activeTab === "sent"
                ? "inline-flex items-center gap-1.5 h-11 px-4 rounded-full text-[12px] font-bold bg-night text-cream"
                : "inline-flex items-center gap-1.5 h-11 px-4 rounded-full text-[12px] font-bold bg-white border border-line text-night-soft hover:border-night/30"
            }
          >
            <Send className="w-3.5 h-3.5" aria-hidden />
            Envoyées
          </Link>
        </nav>

        {offers.length === 0 ? (
          <div className="px-5 sm:px-8 pt-6">
            <EmptyState
              icon={Handshake}
              kicker={activeTab === "received" ? "Aucune offre reçue" : "Aucune offre envoyée"}
              title={
                activeTab === "received" ? (
                  <>
                    Personne n&apos;a fait <em className="italic text-gold-deep">d&apos;offre</em>
                  </>
                ) : (
                  <>
                    Tu n&apos;as <em className="italic text-gold-deep">rien proposé</em>
                  </>
                )
              }
              body={
                activeTab === "received"
                  ? "Quand quelqu'un négociera sur une de tes annonces, tu la verras ici."
                  : "Visite une annonce et clique sur l'icône Handshake pour proposer un prix."
              }
              ctaHref="/marketplace"
              ctaLabel="Parcourir la marketplace"
              size="lg"
            />
          </div>
        ) : (
          <div className="px-4 sm:px-7 pt-5 space-y-3">
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                currentUserId={user.id}
                direction={activeTab}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
