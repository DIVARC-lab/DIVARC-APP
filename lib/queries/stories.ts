import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  Story,
  StoryGroup,
  StoryView,
  StoryWithAuthor,
} from "@/lib/database.types";

type AuthorRow = Pick<
  Profile,
  "id" | "full_name" | "username" | "avatar_url"
>;

async function attachAuthorsAndViews(
  rows: Story[],
  currentUserId: string,
): Promise<StoryWithAuthor[]> {
  if (rows.length === 0) return [];

  const supabase = await createClient();
  const storyIds = rows.map((row) => row.id);
  const authorIds = Array.from(new Set(rows.map((row) => row.author_id)));

  const [{ data: authors }, { data: viewedRows }, { data: viewCounts }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", authorIds),
      supabase
        .from("story_views")
        .select("story_id")
        .eq("viewer_id", currentUserId)
        .in("story_id", storyIds),
      supabase
        .from("story_views")
        .select("story_id")
        .in("story_id", storyIds),
    ]);

  const authorById = new Map<string, AuthorRow>();
  for (const author of authors ?? []) authorById.set(author.id, author);

  const viewedSet = new Set((viewedRows ?? []).map((row) => row.story_id));

  const viewsCountByStory = new Map<string, number>();
  for (const view of viewCounts ?? []) {
    viewsCountByStory.set(
      view.story_id,
      (viewsCountByStory.get(view.story_id) ?? 0) + 1,
    );
  }

  return rows.map((row) => ({
    ...row,
    author: authorById.get(row.author_id) ?? null,
    is_viewed: viewedSet.has(row.id),
    views_count: viewsCountByStory.get(row.id) ?? 0,
  }));
}

export async function listVisibleStories(
  currentUserId: string,
): Promise<StoryWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return attachAuthorsAndViews(data, currentUserId);
}

export function groupStoriesByAuthor(
  stories: StoryWithAuthor[],
  currentUserId: string,
): StoryGroup[] {
  const byAuthor = new Map<string, StoryWithAuthor[]>();
  for (const story of stories) {
    const existing = byAuthor.get(story.author_id) ?? [];
    existing.push(story);
    byAuthor.set(story.author_id, existing);
  }

  const groups: StoryGroup[] = [];
  for (const [authorId, authorStories] of byAuthor) {
    const author = authorStories[0]?.author;
    if (!author) continue;
    const hasUnviewed = authorStories.some((s) => !s.is_viewed);
    groups.push({
      author,
      stories: authorStories.sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      ),
      has_unviewed: hasUnviewed,
    });
  }

  // Place current user first, then friends with unviewed first, then viewed
  groups.sort((a, b) => {
    if (a.author.id === currentUserId) return -1;
    if (b.author.id === currentUserId) return 1;
    if (a.has_unviewed !== b.has_unviewed) return a.has_unviewed ? -1 : 1;
    return 0;
  });

  return groups;
}

export async function getStoryById(
  storyId: string,
  currentUserId: string,
): Promise<StoryWithAuthor | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("id", storyId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;
  const [enriched] = await attachAuthorsAndViews([data], currentUserId);
  return enriched ?? null;
}

export async function listStoryViewers(
  storyId: string,
): Promise<Array<StoryView & { viewer: AuthorRow | null }>> {
  const supabase = await createClient();
  const { data: views } = await supabase
    .from("story_views")
    .select("*")
    .eq("story_id", storyId)
    .order("viewed_at", { ascending: false });

  if (!views || views.length === 0) return [];

  const viewerIds = Array.from(new Set(views.map((v) => v.viewer_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", viewerIds);

  const profileById = new Map<string, AuthorRow>();
  for (const profile of profiles ?? []) profileById.set(profile.id, profile);

  return views.map((view) => ({
    ...view,
    viewer: profileById.get(view.viewer_id) ?? null,
  }));
}
