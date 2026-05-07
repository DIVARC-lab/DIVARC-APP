import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Job,
  JobCategory,
  JobType,
  ListingCategory,
  Profile,
  WorkMode,
} from "@/lib/database.types";

const SEVEN_DAYS_AGO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
};

export type ExplorePerson = Pick<
  Profile,
  | "id"
  | "username"
  | "full_name"
  | "avatar_url"
  | "bio"
  | "location"
  | "founder_rank"
>;

export async function suggestPeople(
  currentUserId: string,
  limit: number = 12,
): Promise<ExplorePerson[]> {
  const supabase = await createClient();

  // Get my friend ids to exclude
  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, recipient_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`);

  const excludeIds = new Set<string>([currentUserId]);
  for (const f of friendships ?? []) {
    excludeIds.add(f.requester_id);
    excludeIds.add(f.recipient_id);
  }

  // Also exclude pending requests
  const { data: pending } = await supabase
    .from("friendships")
    .select("requester_id, recipient_id")
    .eq("status", "pending")
    .or(`requester_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`);

  for (const f of pending ?? []) {
    excludeIds.add(f.requester_id);
    excludeIds.add(f.recipient_id);
  }

  const excludeArray = Array.from(excludeIds);

  let query = supabase
    .from("profiles")
    .select(
      "id, username, full_name, avatar_url, bio, location, founder_rank",
    )
    .eq("discoverable", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (excludeArray.length > 0) {
    query = query.not("id", "in", `(${excludeArray.join(",")})`);
  }

  const { data } = await query;
  return data ?? [];
}

export type TrendingPost = {
  id: string;
  body: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  author: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
  cover_url: string | null;
};

export async function trendingPosts(limit: number = 6): Promise<TrendingPost[]> {
  const supabase = await createClient();

  // Get recent public posts
  const { data: posts } = await supabase
    .from("posts")
    .select("id, body, author_id, created_at, visibility")
    .eq("visibility", "public")
    .is("deleted_at", null)
    .gte("created_at", SEVEN_DAYS_AGO())
    .order("created_at", { ascending: false })
    .limit(limit * 3);

  if (!posts || posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));

  const [{ data: likes }, { data: comments }, { data: photos }, { data: authors }] =
    await Promise.all([
      supabase
        .from("post_likes")
        .select("post_id")
        .in("post_id", postIds),
      supabase
        .from("post_comments")
        .select("post_id")
        .in("post_id", postIds)
        .is("deleted_at", null),
      supabase
        .from("post_photos")
        .select("post_id, url, position")
        .in("post_id", postIds)
        .order("position", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", authorIds),
    ]);

  const likeCount = new Map<string, number>();
  for (const l of likes ?? []) {
    likeCount.set(l.post_id, (likeCount.get(l.post_id) ?? 0) + 1);
  }

  const commentCount = new Map<string, number>();
  for (const c of comments ?? []) {
    commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1);
  }

  const coverByPost = new Map<string, string>();
  for (const p of photos ?? []) {
    if (!coverByPost.has(p.post_id)) coverByPost.set(p.post_id, p.url);
  }

  const authorById = new Map<
    string,
    Pick<Profile, "id" | "full_name" | "username" | "avatar_url">
  >();
  for (const author of authors ?? []) authorById.set(author.id, author);

  const enriched: TrendingPost[] = posts.map((post) => ({
    id: post.id,
    body: post.body,
    created_at: post.created_at,
    likes_count: likeCount.get(post.id) ?? 0,
    comments_count: commentCount.get(post.id) ?? 0,
    author: authorById.get(post.author_id) ?? null,
    cover_url: coverByPost.get(post.id) ?? null,
  }));

  // Sort by engagement (likes + comments) then recency
  enriched.sort((a, b) => {
    const engagementDiff =
      b.likes_count + b.comments_count - (a.likes_count + a.comments_count);
    if (engagementDiff !== 0) return engagementDiff;
    return b.created_at.localeCompare(a.created_at);
  });

  return enriched.slice(0, limit);
}

export type ExploreListing = {
  id: string;
  title: string;
  price_amount: number;
  price_currency: string;
  category: ListingCategory;
  cover_url: string | null;
  location: string | null;
};

export async function featuredListings(
  limit: number = 8,
): Promise<ExploreListing[]> {
  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, price_amount, price_currency, category, location")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!listings || listings.length === 0) return [];

  const ids = listings.map((l) => l.id);
  const { data: photos } = await supabase
    .from("listing_photos")
    .select("listing_id, url, position")
    .in("listing_id", ids)
    .order("position", { ascending: true });

  const coverByListing = new Map<string, string>();
  for (const p of photos ?? []) {
    if (!coverByListing.has(p.listing_id))
      coverByListing.set(p.listing_id, p.url);
  }

  return listings.map((l) => ({
    id: l.id,
    title: l.title,
    price_amount: Number(l.price_amount),
    price_currency: l.price_currency,
    category: l.category,
    cover_url: coverByListing.get(l.id) ?? null,
    location: l.location,
  }));
}

export type ExploreJob = Pick<
  Job,
  | "id"
  | "title"
  | "company_name"
  | "job_type"
  | "work_mode"
  | "category"
  | "location"
  | "salary_min"
  | "salary_max"
  | "salary_currency"
  | "salary_period"
  | "created_at"
>;

export async function featuredJobs(limit: number = 6): Promise<ExploreJob[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select(
      "id, title, company_name, job_type, work_mode, category, location, salary_min, salary_max, salary_currency, salary_period, created_at",
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((job) => ({
    ...job,
    job_type: job.job_type as JobType,
    work_mode: job.work_mode as WorkMode,
    category: job.category as JobCategory,
    salary_min: job.salary_min !== null ? Number(job.salary_min) : null,
    salary_max: job.salary_max !== null ? Number(job.salary_max) : null,
  }));
}
