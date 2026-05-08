import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Circle,
  CircleMemberWithProfile,
  CircleWithMembership,
  Profile,
} from "@/lib/database.types";

type AuthorRow = Pick<
  Profile,
  "id" | "full_name" | "username" | "avatar_url"
>;

async function attachMembership(
  rows: Circle[],
  currentUserId: string,
): Promise<CircleWithMembership[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("circle_members")
    .select("circle_id, role")
    .eq("user_id", currentUserId)
    .in(
      "circle_id",
      rows.map((c) => c.id),
    );

  const map = new Map<string, "admin" | "mod" | "member">();
  for (const m of memberships ?? []) {
    map.set(m.circle_id, m.role as "admin" | "mod" | "member");
  }

  return rows.map((c) => ({
    ...c,
    is_member: map.has(c.id),
    my_role: map.get(c.id) ?? null,
  }));
}

/** Cercles dont l'utilisateur courant est membre (RLS l'empêche de voir
 *  les membres des cercles privés où il n'est pas — donc cette query
 *  retourne tous ses cercles). */
export async function listMyCircles(
  currentUserId: string,
): Promise<CircleWithMembership[]> {
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("circle_members")
    .select("circle_id, role, joined_at")
    .eq("user_id", currentUserId)
    .order("joined_at", { ascending: false });

  if (!memberships || memberships.length === 0) return [];

  const ids = memberships.map((m) => m.circle_id);
  const { data: circles } = await supabase
    .from("circles")
    .select("*")
    .in("id", ids);

  if (!circles) return [];

  const orderById = new Map(memberships.map((m, i) => [m.circle_id, i]));
  const sorted = circles.sort(
    (a, b) =>
      (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0),
  );

  return attachMembership(sorted, currentUserId);
}

/** Cercles publics que l'utilisateur ne suit pas — pour la section "Découvrir". */
export async function listDiscoverableCircles(
  currentUserId: string,
  limit = 12,
): Promise<CircleWithMembership[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("circles")
    .select("*")
    .eq("is_private", false)
    .order("members_count", { ascending: false })
    .limit(limit * 2);

  if (!data) return [];

  const enriched = await attachMembership(data, currentUserId);
  return enriched.filter((c) => !c.is_member).slice(0, limit);
}

export async function getCircleBySlug(
  slug: string,
  currentUserId: string,
): Promise<CircleWithMembership | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("circles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const [enriched] = await attachMembership([data], currentUserId);
  return enriched ?? null;
}

export async function listCircleMembers(
  circleId: string,
  limit = 24,
): Promise<CircleMemberWithProfile[]> {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("circle_members")
    .select("*")
    .eq("circle_id", circleId)
    .order("joined_at", { ascending: false })
    .limit(limit);

  if (!members || members.length === 0) return [];

  const ids = Array.from(new Set(members.map((m) => m.user_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", ids);

  const profById = new Map<string, AuthorRow>();
  for (const p of profiles ?? []) profById.set(p.id, p);

  return members.map((m) => ({
    ...m,
    profile: profById.get(m.user_id) ?? null,
  }));
}
