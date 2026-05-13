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

/* Cercles de l'user + nb de posts non lus (créés depuis last_active_at
 * du membre, en excluant ses propres posts). Cap à 99 (UI = "99+"). */
export type MyCircleSummary = CircleWithMembership & {
  unread_posts_count: number;
  last_active_at: string;
};

const UNREAD_CAP = 99;

export async function listMyCirclesWithUnread(
  currentUserId: string,
): Promise<MyCircleSummary[]> {
  const supabase = await createClient();

  /* Charge memberships avec last_active_at (migration 0092). Fallback
   * sur joined_at pour rows pré-migration. */
  const { data: memberships } = await supabase
    .from("circle_members")
    .select("circle_id, role, joined_at, last_active_at")
    .eq("user_id", currentUserId)
    .order("last_active_at", { ascending: false, nullsFirst: false });

  if (!memberships || memberships.length === 0) return [];

  type MemberRow = {
    circle_id: string;
    role: string;
    joined_at: string;
    last_active_at: string | null;
  };

  const memberRows = memberships as MemberRow[];
  const ids = memberRows.map((m) => m.circle_id);
  const sinceByCircle = new Map<string, string>(
    memberRows.map((m) => [
      m.circle_id,
      m.last_active_at ?? m.joined_at,
    ]),
  );

  const [{ data: circles }, ...unreadResults] = await Promise.all([
    supabase.from("circles").select("*").in("id", ids),
    ...memberRows.map((m) =>
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("circle_id", m.circle_id)
        .is("deleted_at", null)
        .neq("author_id", currentUserId)
        .gt("created_at", m.last_active_at ?? m.joined_at),
    ),
  ]);

  if (!circles) return [];

  const unreadByCircle = new Map<string, number>();
  memberRows.forEach((m, i) => {
    const res = unreadResults[i];
    if (res && !res.error) {
      unreadByCircle.set(m.circle_id, Math.min(res.count ?? 0, UNREAD_CAP));
    }
  });

  const orderById = new Map(memberRows.map((m, i) => [m.circle_id, i]));
  const sorted = circles.sort(
    (a, b) =>
      (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0),
  );

  const enriched = await attachMembership(sorted, currentUserId);

  return enriched.map((c) => ({
    ...c,
    unread_posts_count: unreadByCircle.get(c.id) ?? 0,
    last_active_at: sinceByCircle.get(c.id) ?? c.created_at,
  }));
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

/* Chantier 2.3 — Discovery avec filtres catégorie + tri transparent.
 *
 * sort='active' : fallback (vitality_score desc, members desc) tant que le
 * cron Chantier 5.5 n'alimente pas vitality_score. La formule pondérée
 * complète arrive en Chantier 2.4 via RPC discover_circles_v2.
 */
export type DiscoverSort =
  | "active"
  | "recent"
  | "largest"
  | "nearby"
  | "recommended";

export type DiscoverFilters = {
  sort?: DiscoverSort;
  category?: string;
  /* Pour 'nearby' — country code 2 chars (FR/US/...) déduit du profil. */
  nearbyCountry?: string | null;
  query?: string;
  limit?: number;
};

export async function discoverCircles(
  currentUserId: string,
  filters: DiscoverFilters = {},
): Promise<CircleWithMembership[]> {
  const supabase = await createClient();
  const limit = filters.limit ?? 24;
  const sort: DiscoverSort = filters.sort ?? "active";

  let query = supabase
    .from("circles")
    .select("*")
    /* Visibilité publique uniquement (migration 0091). On accepte aussi
     * is_private=false pour les cercles V1 pré-migration. */
    .or("visibility.eq.public,is_private.eq.false")
    .is("archived_at", null);

  if (filters.category) {
    query = query.eq("primary_category", filters.category);
  }
  if (filters.query && filters.query.trim().length > 0) {
    const sanitized = filters.query.trim().replace(/[%,]/g, "").slice(0, 60);
    query = query.or(
      `name.ilike.%${sanitized}%,description.ilike.%${sanitized}%,tagline.ilike.%${sanitized}%`,
    );
  }
  if (sort === "nearby" && filters.nearbyCountry) {
    query = query.eq("location_country", filters.nearbyCountry);
  }

  switch (sort) {
    case "recent":
      query = query.order("created_at", { ascending: false });
      break;
    case "largest":
      query = query.order("members_count", { ascending: false });
      break;
    case "nearby":
      query = query
        .eq("is_local", true)
        .order("members_count", { ascending: false });
      break;
    case "recommended":
      /* V1 fallback (2.5 fera le vrai matching avec reasons[]). */
      query = query
        .order("vitality_score", { ascending: false })
        .order("members_count", { ascending: false });
      break;
    case "active":
    default:
      query = query
        .order("vitality_score", { ascending: false })
        .order("posts_count_7d", { ascending: false, nullsFirst: false })
        .order("members_count", { ascending: false });
      break;
  }

  /* On élargit le fetch pour pouvoir filtrer côté JS les cercles dont
   * l'user est déjà membre. */
  const { data } = await query.limit(limit * 2);
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
