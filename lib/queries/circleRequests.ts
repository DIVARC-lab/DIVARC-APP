/* lib/queries/circleRequests.ts — board Demandes & Offres cercles. */

import { createClient } from "@/lib/supabase/server";
import type {
  CircleRequest,
  CircleRequestWithAuthor,
  Profile,
} from "@/lib/database.types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

type ProfileLite = Pick<Profile, "id" | "full_name" | "username" | "avatar_url">;

type ListOpts = {
  kind?: "request" | "offer" | "all";
  status?: "open" | "fulfilled" | "all";
  limit?: number;
};

export async function listCircleRequests(
  circleId: string,
  opts: ListOpts = {},
): Promise<CircleRequestWithAuthor[]> {
  const supabase = await createClient();
  const kind = opts.kind ?? "all";
  const status = opts.status ?? "open";
  const limit = opts.limit ?? 50;

  let query = (supabase as SupabaseAny)
    .from("circle_requests")
    .select("*")
    .eq("circle_id", circleId)
    .is("deleted_at", null);

  if (kind !== "all") query = query.eq("kind", kind);
  if (status === "open") {
    query = query.in("status", ["open", "in_progress"]);
  } else if (status === "fulfilled") {
    query = query.eq("status", "fulfilled");
  }
  query = query
    .order("karma_boost", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data, error } = await query;
  if (error || !data) return [];

  const rows = data as CircleRequest[];
  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  if (authorIds.length === 0) return rows as CircleRequestWithAuthor[];

  const { data: authors } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", authorIds);

  const authorById = new Map<string, ProfileLite>();
  for (const a of (authors ?? []) as ProfileLite[]) authorById.set(a.id, a);

  /* Count responses par request (optionnel — peut être skip pour
     perf si la liste est très longue). */
  const requestIds = rows.map((r) => r.id);
  const { data: responsesRaw } = await (supabase as SupabaseAny)
    .from("circle_request_responses")
    .select("request_id")
    .in("request_id", requestIds);
  const responsesByRequest = new Map<string, number>();
  for (const r of (responsesRaw ?? []) as Array<{ request_id: string }>) {
    responsesByRequest.set(
      r.request_id,
      (responsesByRequest.get(r.request_id) ?? 0) + 1,
    );
  }

  return rows.map((r) => ({
    ...r,
    author: authorById.get(r.author_id) ?? null,
    responses_count: responsesByRequest.get(r.id) ?? 0,
  })) as CircleRequestWithAuthor[];
}

export async function getCircleRequest(
  requestId: string,
): Promise<CircleRequestWithAuthor | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny)
    .from("circle_requests")
    .select("*")
    .eq("id", requestId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;

  const { data: author } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .eq("id", data.author_id)
    .maybeSingle();

  return { ...(data as CircleRequest), author: author as ProfileLite } as CircleRequestWithAuthor;
}

export async function getMyCircleKarma(
  circleId: string,
  userId: string,
): Promise<number> {
  const supabase = await createClient();
  const { data } = await (supabase as SupabaseAny)
    .from("circle_member_karma")
    .select("points")
    .eq("circle_id", circleId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.points as number | undefined) ?? 0;
}
