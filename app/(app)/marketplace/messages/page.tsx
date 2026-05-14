import { ArrowLeft, MessageSquare } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { listMarketplaceConversations } from "@/lib/queries/marketplaceConversations";
import { formatRelative } from "@/lib/utils/relativeTime";
import { createClient } from "@/lib/supabase/server";
import { Container } from "@/components/primitives/Container";

export const metadata = {
  title: "Messages marketplace",
};

export default async function MarketplaceMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conversations = await listMarketplaceConversations(user.id);

  return (
    <div className="bg-bg-soft min-h-[calc(100dvh-56px)]">
      <Container maxWidth="text" paddingX="none">
        <header className="px-4 sm:px-8 pt-6 sm:pt-10 pb-4">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-[12px] text-night-dim hover:text-night mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
            Retour à la marketplace
          </Link>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
            · Messagerie marketplace
          </span>
          <h1 className="mt-1 font-display text-[26px] sm:text-[36px] text-night leading-tight">
            <em className="italic">Tes discussions</em> d&apos;annonces
          </h1>
          <p className="mt-1.5 text-[12px] text-night-dim max-w-prose">
            Toutes tes conversations autour des objets achetés ou vendus.
            Séparées de tes messages personnels.
          </p>
        </header>

        {conversations.length === 0 ? (
          <div className="px-4 sm:px-8 pt-2">
            <EmptyState
              emoji="💬"
              kicker="Aucune discussion"
              title="Pas encore de message marketplace"
              body="Quand tu contactes un vendeur ou qu'un acheteur t'écrit sur une de tes annonces, la conversation apparaît ici."
              ctaHref="/marketplace"
              ctaLabel="Explorer le marché"
              size="lg"
            />
          </div>
        ) : (
          <ul className="px-2 sm:px-6 pb-10">
            {conversations.map((conv) => (
              <li key={conv.conversationId}>
                <Link
                  href={`/marketplace/messages/${conv.conversationId}`}
                  className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white transition-colors"
                >
                  {/* Photo listing */}
                  <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-night/5 border border-line">
                    {conv.listing?.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={conv.listing.coverUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-2xl">
                        🛍️
                      </div>
                    )}
                    {conv.unreadCount > 0 ? (
                      <span
                        aria-hidden
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gold border-2 border-bg-soft"
                      />
                    ) : null}
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[13px] font-bold text-night truncate">
                        {conv.listing?.title ?? "Annonce supprimée"}
                      </p>
                      <span className="shrink-0 text-[10px] text-night-dim">
                        {formatRelative(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-night-dim truncate">
                      <span
                        className={
                          conv.isOwnListing
                            ? "text-emerald-600 font-bold"
                            : "text-gold-deep font-bold"
                        }
                      >
                        {conv.isOwnListing ? "Acheteur :" : "Vendeur :"}
                      </span>{" "}
                      {conv.counterparty?.fullName ??
                        conv.counterparty?.username ??
                        "—"}
                    </p>
                    {conv.lastMessage?.body ? (
                      <p
                        className={`mt-0.5 text-[12px] truncate ${
                          conv.unreadCount > 0
                            ? "text-night font-semibold"
                            : "text-night-dim"
                        }`}
                      >
                        {conv.lastMessage.body}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[11px] italic text-night-dim/70">
                        Aucun message — ouvre la discussion pour démarrer
                      </p>
                    )}
                  </div>

                  {/* Prix */}
                  {conv.listing ? (
                    <span className="shrink-0 font-display italic text-[14px] text-night">
                      {formatPrice(
                        conv.listing.priceAmount,
                        conv.listing.priceCurrency,
                      )}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>

      {/* Marker icon pour pas que MessageSquare soit tree-shaké si non utilisé */}
      <span className="sr-only">
        <MessageSquare aria-hidden />
      </span>
    </div>
  );
}

function formatPrice(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return "—";
  const formatted = Number.isInteger(amount)
    ? amount.toLocaleString("fr-FR")
    : amount.toFixed(2).replace(".", ",");
  const symbol = currency === "EUR" ? "€" : currency;
  return `${formatted} ${symbol}`;
}
