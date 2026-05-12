import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Message } from "@/lib/database.types";

/* Conversations marketplace (type='listing_chat').
 * Liste pour /marketplace/messages — UI séparée des messages personnels. */

export type MarketplaceConversationItem = {
  conversationId: string;
  listingId: string | null;
  listing: {
    title: string;
    coverUrl: string | null;
    priceAmount: number;
    priceCurrency: string;
  } | null;
  counterparty: {
    userId: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
  } | null;
  lastMessage: Message | null;
  lastMessageAt: string;
  unreadCount: number;
  isOwnListing: boolean;
};

export async function listMarketplaceConversations(
  userId: string,
): Promise<MarketplaceConversationItem[]> {
  const supabase = await createClient();

  /* 1. Toutes les conv où l'user est membre. */
  const { data: memberRows } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);
  if (!memberRows || memberRows.length === 0) return [];

  const convIds = memberRows.map((m) => m.conversation_id);
  const lastReadByConv = new Map(
    memberRows.map((m) => [m.conversation_id, m.last_read_at]),
  );

  /* 2. Filtre type='listing_chat' avec listing_id. */
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, listing_id, last_message_at")
    .in("id", convIds)
    .eq("type", "listing_chat")
    .order("last_message_at", { ascending: false });
  if (!conversations || conversations.length === 0) return [];

  const filteredIds = conversations.map((c) => c.id);
  const listingIds = Array.from(
    new Set(conversations.map((c) => c.listing_id).filter((x): x is string => !!x)),
  );

  /* 3. Charge les listings (title, photo, prix, seller). */
  const [{ data: listings }, { data: members }, { data: lastMessages }] =
    await Promise.all([
      listingIds.length > 0
        ? supabase
            .from("listings")
            .select("id, title, price_amount, price_currency, seller_id")
            .in("id", listingIds)
        : Promise.resolve({ data: [] as Array<{
            id: string;
            title: string;
            price_amount: number;
            price_currency: string;
            seller_id: string;
          }> }),
      supabase
        .from("conversation_members")
        .select("conversation_id, user_id")
        .in("conversation_id", filteredIds),
      supabase
        .from("messages")
        .select("*")
        .in("conversation_id", filteredIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);

  /* Photos couverture (1ère photo par listing). */
  const photosByListing = new Map<string, string>();
  if (listingIds.length > 0) {
    const { data: photos } = await supabase
      .from("listing_photos")
      .select("listing_id, url, position")
      .in("listing_id", listingIds)
      .order("position", { ascending: true });
    for (const p of photos ?? []) {
      if (!photosByListing.has(p.listing_id)) {
        photosByListing.set(p.listing_id, p.url);
      }
    }
  }

  const listingById = new Map(
    (listings ?? []).map((l) => [l.id, l]),
  );

  /* Counterparty (autre membre que `userId`). */
  const otherUserIdByConv = new Map<string, string>();
  for (const m of members ?? []) {
    if (m.user_id !== userId) {
      otherUserIdByConv.set(m.conversation_id, m.user_id);
    }
  }
  const otherUserIds = Array.from(new Set(otherUserIdByConv.values()));
  const profilesByUser = new Map<
    string,
    { full_name: string | null; username: string | null; avatar_url: string | null }
  >();
  if (otherUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", otherUserIds);
    for (const p of profiles ?? []) {
      profilesByUser.set(p.id, p);
    }
  }

  /* Last message par conv. */
  const lastMsgByConv = new Map<string, Message>();
  for (const m of lastMessages ?? []) {
    if (!lastMsgByConv.has(m.conversation_id)) {
      lastMsgByConv.set(m.conversation_id, m);
    }
  }

  /* Build items. */
  return conversations.map((conv) => {
    const listing = conv.listing_id ? listingById.get(conv.listing_id) : null;
    const otherId = otherUserIdByConv.get(conv.id) ?? null;
    const profile = otherId ? profilesByUser.get(otherId) ?? null : null;
    const lastMessage = lastMsgByConv.get(conv.id) ?? null;
    const lastReadAt = lastReadByConv.get(conv.id) ?? null;

    const unread =
      lastMessage &&
      lastReadAt &&
      new Date(lastMessage.created_at) > new Date(lastReadAt)
        ? 1
        : 0;

    return {
      conversationId: conv.id,
      listingId: conv.listing_id,
      listing: listing
        ? {
            title: listing.title,
            coverUrl: photosByListing.get(listing.id) ?? null,
            priceAmount: Number(listing.price_amount),
            priceCurrency: listing.price_currency,
          }
        : null,
      counterparty: otherId
        ? {
            userId: otherId,
            fullName: profile?.full_name ?? null,
            username: profile?.username ?? null,
            avatarUrl: profile?.avatar_url ?? null,
          }
        : null,
      lastMessage,
      lastMessageAt: conv.last_message_at,
      unreadCount: unread,
      isOwnListing: listing?.seller_id === userId,
    };
  });
}
