import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type GlobalSearchResults = {
  users: Array<{
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    location: string | null;
  }>;
  listings: Array<{
    id: string;
    title: string;
    price_amount: number;
    price_currency: string;
    photo_url: string | null;
    category: string;
  }>;
  posts: Array<{
    id: string;
    body: string | null;
    author_name: string | null;
    author_username: string | null;
    author_avatar_url: string | null;
    created_at: string;
  }>;
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (query.length < 2) {
    return NextResponse.json({
      results: { users: [], listings: [], posts: [] } as GlobalSearchResults,
    });
  }

  const sanitized = query.replace(/[%,]/g, "").slice(0, 60);

  // Run 3 searches in parallel
  const [usersRes, listingsRes, postsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, location")
      .eq("discoverable", true)
      .neq("id", user.id)
      .or(`full_name.ilike.%${sanitized}%,username.ilike.%${sanitized}%`)
      .limit(5),
    supabase
      .from("listings")
      .select("id, title, price_amount, price_currency, category")
      .eq("status", "active")
      .or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("posts")
      .select("id, body, author_id, created_at")
      .is("deleted_at", null)
      .ilike("body", `%${sanitized}%`)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Fetch first photos for listings
  const listingIds = (listingsRes.data ?? []).map((l) => l.id);
  const photosByListing = new Map<string, string>();
  if (listingIds.length > 0) {
    const { data: photos } = await supabase
      .from("listing_photos")
      .select("listing_id, url, position")
      .in("listing_id", listingIds)
      .order("position", { ascending: true });
    for (const photo of photos ?? []) {
      if (!photosByListing.has(photo.listing_id)) {
        photosByListing.set(photo.listing_id, photo.url);
      }
    }
  }

  // Fetch authors for posts
  const authorIds = Array.from(
    new Set((postsRes.data ?? []).map((p) => p.author_id)),
  );
  const authorById = new Map<
    string,
    { full_name: string | null; username: string | null; avatar_url: string | null }
  >();
  if (authorIds.length > 0) {
    const { data: authors } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", authorIds);
    for (const author of authors ?? []) {
      authorById.set(author.id, {
        full_name: author.full_name,
        username: author.username,
        avatar_url: author.avatar_url,
      });
    }
  }

  const results: GlobalSearchResults = {
    users: usersRes.data ?? [],
    listings: (listingsRes.data ?? []).map((listing) => ({
      id: listing.id,
      title: listing.title,
      price_amount: Number(listing.price_amount),
      price_currency: listing.price_currency,
      category: listing.category,
      photo_url: photosByListing.get(listing.id) ?? null,
    })),
    posts: (postsRes.data ?? []).map((post) => {
      const author = authorById.get(post.author_id);
      return {
        id: post.id,
        body: post.body,
        author_name: author?.full_name ?? null,
        author_username: author?.username ?? null,
        author_avatar_url: author?.avatar_url ?? null,
        created_at: post.created_at,
      };
    }),
  };

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "no-store" } },
  );
}
