import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConversationView } from "@/app/(app)/messages/_components/ConversationView";
import {
  getConversationDetails,
  getMessagesForConversation,
  getReactionsForConversation,
} from "@/lib/queries/conversations";
import { createClient } from "@/lib/supabase/server";
import { Container } from "@/components/primitives/Container";

type Params = Promise<{ id: string }>;

export const metadata = {
  title: "Discussion marketplace",
};

/* Chat marketplace : réutilise ConversationView (composants chat existants)
 * avec un header dédié qui affiche l'annonce concernée. */
export default async function MarketplaceChatPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const details = await getConversationDetails(id);
  if (!details) notFound();

  const { conversation, otherMember, otherLastReadAt } = details;

  /* Si la conv n'est pas une listing_chat, redirige vers la messagerie perso. */
  if (conversation.type !== "listing_chat") {
    redirect(`/messages/${id}`);
  }

  /* Charge le listing pour le header. */
  const { data: listing } = conversation.listing_id
    ? await supabase
        .from("listings")
        .select("id, title, price_amount, price_currency, seller_id, status")
        .eq("id", conversation.listing_id)
        .maybeSingle()
    : { data: null };

  /* Cover photo. */
  let coverUrl: string | null = null;
  if (listing) {
    const { data: photos } = await supabase
      .from("listing_photos")
      .select("url, position")
      .eq("listing_id", listing.id)
      .order("position", { ascending: true })
      .limit(1);
    coverUrl = photos?.[0]?.url ?? null;
  }

  const [initialMessages, initialReactions] = await Promise.all([
    getMessagesForConversation(id),
    getReactionsForConversation(id),
  ]);

  /* Marque la conv comme lue. */
  await supabase.rpc("mark_conversation_read", { conv_id: id });

  const memberMap = otherMember
    ? {
        [otherMember.id]: {
          user_id: otherMember.id,
          full_name: otherMember.full_name,
          username: otherMember.username,
          avatar_url: otherMember.avatar_url,
        },
      }
    : {};

  const isOwnListing = listing?.seller_id === user.id;

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] bg-bg-soft">
      {/* Header marketplace personnalisé : back + listing card */}
      <header className="shrink-0 border-b border-line bg-white">
        <Container maxWidth="text" paddingX="page" className="py-3 flex items-center gap-3">
          <Link
            href="/marketplace/messages"
            aria-label="Retour aux messages marketplace"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-bg-soft transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-night" aria-hidden />
          </Link>

          {listing ? (
            <Link
              href={`/marketplace/${listing.id}`}
              className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-90 transition-opacity"
            >
              <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-night/5 border border-line">
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-base">
                    🛍️
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-night truncate">
                  {listing.title}
                </p>
                <p className="text-[11px] text-night-dim">
                  <span
                    className={
                      isOwnListing
                        ? "text-emerald-600 font-bold"
                        : "text-gold-deep font-bold"
                    }
                  >
                    {isOwnListing ? "Tu vends à" : "Vendeur :"}
                  </span>{" "}
                  {otherMember?.full_name ??
                    otherMember?.username ??
                    "Utilisateur"}
                </p>
              </div>
              <span className="font-display italic text-[16px] text-night shrink-0">
                {formatPrice(
                  Number(listing.price_amount),
                  listing.price_currency,
                )}
              </span>
              <ExternalLink
                className="w-3.5 h-3.5 text-night-dim shrink-0"
                aria-hidden
              />
            </Link>
          ) : (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-night truncate">
                Annonce supprimée
              </p>
              <p className="text-[11px] text-night-dim">
                {otherMember?.full_name ??
                  otherMember?.username ??
                  "Utilisateur"}
              </p>
            </div>
          )}
        </Container>
      </header>

      {/* Body : ConversationView existant. */}
      <ConversationView
        conversationId={id}
        currentUserId={user.id}
        initialMessages={initialMessages}
        initialReactions={initialReactions}
        initialOtherLastReadAt={otherLastReadAt}
        otherMember={
          otherMember
            ? {
                user_id: otherMember.id,
                full_name: otherMember.full_name,
                username: otherMember.username,
                avatar_url: otherMember.avatar_url,
              }
            : null
        }
        memberMap={memberMap}
        isGroup={false}
        secretContext={null}
      />
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
