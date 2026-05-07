import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Listing,
  ListingCategory,
  ListingPhoto,
  ListingWithDetails,
  Profile,
} from "@/lib/database.types";

type SellerProfile = Pick<
  Profile,
  "id" | "full_name" | "username" | "avatar_url" | "location"
>;

type ListWithDetailsOptions = {
  category?: ListingCategory;
  query?: string;
  limit?: number;
  offset?: number;
  status?: Listing["status"];
  sellerId?: string;
};

async function attachDetails(
  rows: Listing[],
  currentUserId: string | null,
): Promise<ListingWithDetails[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();

  const listingIds = rows.map((row) => row.id);
  const sellerIds = Array.from(new Set(rows.map((row) => row.seller_id)));

  const [{ data: photos }, { data: sellers }, favoriteResults, favoriteCounts] =
    await Promise.all([
      supabase
        .from("listing_photos")
        .select("*")
        .in("listing_id", listingIds)
        .order("position", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, location")
        .in("id", sellerIds),
      currentUserId
        ? supabase
            .from("favorites")
            .select("listing_id")
            .eq("user_id", currentUserId)
            .in("listing_id", listingIds)
        : Promise.resolve({ data: [] as { listing_id: string }[] }),
      supabase
        .from("favorites")
        .select("listing_id")
        .in("listing_id", listingIds),
    ]);

  const photosByListing = new Map<string, ListingPhoto[]>();
  for (const photo of photos ?? []) {
    const existing = photosByListing.get(photo.listing_id) ?? [];
    existing.push(photo);
    photosByListing.set(photo.listing_id, existing);
  }

  const sellerById = new Map<string, SellerProfile>();
  for (const seller of sellers ?? []) {
    sellerById.set(seller.id, seller);
  }

  const favoritedIds = new Set(
    (favoriteResults.data ?? []).map((row) => row.listing_id),
  );

  const favoriteCountByListing = new Map<string, number>();
  for (const fav of favoriteCounts.data ?? []) {
    favoriteCountByListing.set(
      fav.listing_id,
      (favoriteCountByListing.get(fav.listing_id) ?? 0) + 1,
    );
  }

  return rows.map((row) => ({
    ...row,
    photos: photosByListing.get(row.id) ?? [],
    seller: sellerById.get(row.seller_id) ?? null,
    is_favorited: favoritedIds.has(row.id),
    favorites_count: favoriteCountByListing.get(row.id) ?? 0,
  }));
}

export async function listListings(
  currentUserId: string | null,
  options: ListWithDetailsOptions = {},
): Promise<ListingWithDetails[]> {
  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select("*")
    .eq("status", options.status ?? "active")
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 50);

  if (options.category) {
    query = query.eq("category", options.category);
  }
  if (options.sellerId) {
    query = query.eq("seller_id", options.sellerId);
  }
  if (options.query && options.query.trim().length > 0) {
    const sanitized = options.query.trim().replace(/[%,]/g, "").slice(0, 80);
    query = query.or(
      `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`,
    );
  }
  if (options.offset && options.offset > 0) {
    query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return attachDetails(data, currentUserId);
}

export async function getListingById(
  id: string,
  currentUserId: string | null,
): Promise<ListingWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const [enriched] = await attachDetails([data], currentUserId);
  return enriched ?? null;
}

export async function listMyListings(
  userId: string,
): Promise<ListingWithDetails[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });
  if (!data) return [];
  return attachDetails(data, userId);
}

export async function listFavoriteListings(
  userId: string,
): Promise<ListingWithDetails[]> {
  const supabase = await createClient();
  const { data: favorites } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!favorites || favorites.length === 0) return [];

  const ids = favorites.map((f) => f.listing_id);
  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .in("id", ids)
    .eq("status", "active");

  if (!listings) return [];
  return attachDetails(listings, userId);
}
