import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ProfileSectionVisibility } from "@/lib/database.types";

/* Filtrage server-side de la visibilité des sections du profil V2.
 *
 * Pour chaque section, on calcule si le viewer peut la voir en croisant :
 *   - sections_visibility[section_id] (stocké côté owner)
 *   - relation entre viewer et owner : self / friend / friend_of_friend /
 *     public
 *   - viewAsMode (override owner-only pour preview)
 *
 * Default si aucune visibilité enregistrée pour une section : "public".
 *
 * Utilisé par la page /u/[username] avant de render chaque section. */

export type ViewerRelation =
  | "self"
  | "friend"
  | "friend_of_friend"
  | "public";

export type ViewAsMode =
  | "public"
  | "friends"
  | "friends_of_friends"
  | null
  | undefined;

/* Calcule la relation entre viewer et owner.
 * - self      : même user
 * - friend    : friendships accepted
 * - friend_of_friend : ≥ 1 ami commun (via user_follows mutual ou
 *   friendships indirectes — V1 simple via friendships avec un hop)
 * - public    : aucun lien */
export async function computeViewerRelation(
  viewerId: string,
  ownerId: string,
): Promise<ViewerRelation> {
  if (viewerId === ownerId) return "self";

  const supabase = await createClient();

  /* Check friendship directe accepted */
  const { data: friendship } = await supabase
    .from("friendships")
    .select("status")
    .or(
      `and(requester_id.eq.${viewerId},recipient_id.eq.${ownerId}),and(requester_id.eq.${ownerId},recipient_id.eq.${viewerId})`,
    )
    .eq("status", "accepted")
    .maybeSingle();

  if (friendship) return "friend";

  /* Check friend_of_friend : amis de l'owner qui sont amis du viewer.
     V1 simple : 1 query pour trouver les amis acceptés communs.
     Coûteux pour gros graphes — V2 cache via user_graph. */
  const { data: ownerFriends } = await supabase
    .from("friendships")
    .select("requester_id, recipient_id")
    .or(`requester_id.eq.${ownerId},recipient_id.eq.${ownerId}`)
    .eq("status", "accepted")
    .limit(500);

  if (ownerFriends && ownerFriends.length > 0) {
    const ownerFriendIds = ownerFriends
      .map((f) => (f.requester_id === ownerId ? f.recipient_id : f.requester_id))
      .filter((id): id is string => typeof id === "string" && id !== ownerId);

    if (ownerFriendIds.length > 0) {
      const { data: viewerFriendsWithOwnerFriends } = await supabase
        .from("friendships")
        .select("requester_id, recipient_id")
        .or(
          `and(requester_id.eq.${viewerId},recipient_id.in.(${ownerFriendIds.join(",")})),and(recipient_id.eq.${viewerId},requester_id.in.(${ownerFriendIds.join(",")}))`,
        )
        .eq("status", "accepted")
        .limit(1);

      if (
        viewerFriendsWithOwnerFriends &&
        viewerFriendsWithOwnerFriends.length > 0
      ) {
        return "friend_of_friend";
      }
    }
  }

  return "public";
}

/* Helper pur : peut-on voir une section selon la visibilité enregistrée
 * et la relation du viewer ? Tient compte du viewAsMode (preview owner). */
export function canViewSection(
  sectionId: string,
  visibilityMap: Record<string, ProfileSectionVisibility>,
  relation: ViewerRelation,
  viewAsMode: ViewAsMode = null,
): boolean {
  /* En mode view_as, on simule la relation. */
  const effectiveRelation: ViewerRelation = viewAsMode
    ? viewAsMode === "public"
      ? "public"
      : viewAsMode === "friends"
        ? "friend"
        : "friend_of_friend"
    : relation;

  /* Default visibility = public si non défini. */
  const vis = visibilityMap[sectionId] ?? "public";

  if (vis === "public") return true;
  if (vis === "private") return effectiveRelation === "self";
  if (vis === "friends") {
    return (
      effectiveRelation === "self" || effectiveRelation === "friend"
    );
  }
  if (vis === "friends_of_friends") {
    return (
      effectiveRelation === "self" ||
      effectiveRelation === "friend" ||
      effectiveRelation === "friend_of_friend"
    );
  }
  /* custom V2 : pour l'instant on traite comme public (fallback safe). */
  return true;
}
