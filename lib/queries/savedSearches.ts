import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { JobSavedSearch } from "@/lib/database.types";

export async function listMySavedSearches(
  userId: string,
): Promise<JobSavedSearch[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_saved_searches")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
