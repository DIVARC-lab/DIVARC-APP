import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Hashtag } from "@/lib/database.types";

export async function listTrendingHashtags(
  limit: number = 10,
): Promise<Hashtag[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hashtags")
    .select("*")
    .gt("posts_count", 0)
    .order("posts_count", { ascending: false })
    .limit(limit);
  return data ?? [];
}
