import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  ListingOffer,
  ListingOfferWithCounterparty,
  Profile,
} from "@/lib/database.types";

type Direction = "received" | "sent" | "all";

/* Liste les offres concernant l'utilisateur courant, en filtrant par
 * direction (reçues = je suis to_user, envoyées = je suis from_user). */
export async function listMyOffers(
  userId: string,
  direction: Direction = "all",
): Promise<ListingOfferWithCounterparty[]> {
  const supabase = await createClient();

  let query = supabase
    .from("listing_offers")
    .select("*")
    .order("created_at", { ascending: false });

  if (direction === "received") {
    query = query.eq("to_user", userId);
  } else if (direction === "sent") {
    query = query.eq("from_user", userId);
  } else {
    query = query.or(`from_user.eq.${userId},to_user.eq.${userId}`);
  }

  const { data: offers } = await query;
  if (!offers || offers.length === 0) return [];

  /* On récupère en batch les profils contreparties + les listings parents. */
  const counterpartyIds = Array.from(
    new Set(
      offers.map((o) => (o.from_user === userId ? o.to_user : o.from_user)),
    ),
  );
  const listingIds = Array.from(new Set(offers.map((o) => o.listing_id)));

  const [{ data: profiles }, { data: listings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", counterpartyIds),
    supabase
      .from("listings")
      .select("id, title, price_amount, price_currency, status")
      .in("id", listingIds),
  ]);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p as Pick<Profile, "id" | "full_name" | "username" | "avatar_url">]),
  );
  const listingMap = new Map((listings ?? []).map((l) => [l.id, l]));

  return offers.map((offer) => ({
    ...(offer as ListingOffer),
    counterparty:
      profileMap.get(offer.from_user === userId ? offer.to_user : offer.from_user) ?? null,
    listing: listingMap.get(offer.listing_id) ?? null,
  }));
}

/* Liste le thread (chaîne d'offres / contre-offres) sur un listing entre
 * deux utilisateurs (l'acheteur initial et le vendeur). On reconstitue le
 * thread du parent_offer_id le plus haut au plus récent. */
export async function listOfferThread(
  listingId: string,
  buyerId: string,
  sellerId: string,
): Promise<ListingOffer[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listing_offers")
    .select("*")
    .eq("listing_id", listingId)
    .or(`from_user.eq.${buyerId},from_user.eq.${sellerId}`)
    .or(`to_user.eq.${buyerId},to_user.eq.${sellerId}`)
    .order("created_at", { ascending: true });

  return (data ?? []) as ListingOffer[];
}

/* Compte les offres en attente reçues (pour badge dans la nav marketplace). */
export async function countPendingReceivedOffers(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("listing_offers")
    .select("id", { count: "exact", head: true })
    .eq("to_user", userId)
    .eq("status", "pending");
  return count ?? 0;
}
