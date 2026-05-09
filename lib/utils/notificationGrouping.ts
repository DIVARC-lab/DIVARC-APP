import type { NotificationWithActor, Profile } from "@/lib/database.types";

export type NotificationActor = Pick<
  Profile,
  "id" | "full_name" | "username" | "avatar_url"
>;

export type GroupedNotification = {
  /** ID le plus récent de la chaîne (utilisé comme key React). */
  id: string;
  type: NotificationWithActor["type"];
  /** Titre construit à partir des actors agrégés ("Alice + 4 autres ont aimé ton post"). */
  title: string;
  body: string | null;
  href: string | null;
  /** ISO date du plus récent — utilisé pour le tri et le formatRelative. */
  created_at: string;
  /** True si toutes les notifs du groupe ont été lues. */
  read_at: string | null;
  /** Liste des actors uniques dans la fenêtre 24h, plus récent en premier. */
  actors: NotificationActor[];
  /** Nombre total de notifs agrégées. */
  count: number;
  /** IDs de toutes les notifs du groupe pour markAllAsRead. */
  notification_ids: string[];
};

/* Fenêtre de groupement : on agrège les notifications similaires (même
 * type + même href) reçues dans les 24h glissantes. Au-delà, chaque notif
 * reste séparée. */
const GROUPING_WINDOW_MS = 24 * 60 * 60 * 1000;

/* Groupe une liste de notifications par (type, href, fenêtre 24h glissante).
 * Retourne un array trié par date (plus récent en tête).
 *
 * Si le `type` est de la catégorie "1-on-1" (DM, friend_request, mention),
 * on ne groupe pas (chaque notif reste séparée car le contexte est unique).
 * Pour les "broadcast" (like, comment, follow, etc.), on agrège.
 */
/* Types qui restent 1-on-1 (chaque notif a un contexte unique :
 * conversation pour new_message, demande pour friend_request_*).
 * Les autres types (futurs likes / comments / mentions) seront groupés
 * automatiquement quand ils seront ajoutés à la table. */
const SINGLE_NOTIF_TYPES: NotificationWithActor["type"][] = [
  "new_message",
  "friend_request_received",
  "friend_request_accepted",
  "friend_request_rejected",
];

export function groupNotifications(
  notifications: NotificationWithActor[],
): GroupedNotification[] {
  /* On itère par ordre chronologique inverse (déjà trié dans la query
     listNotificationsForUser). Pour chaque notif, on cherche un groupe
     existant dans la fenêtre, sinon on en crée un nouveau. */
  const groups: GroupedNotification[] = [];

  for (const notif of notifications) {
    const isSingle = SINGLE_NOTIF_TYPES.includes(notif.type);

    if (isSingle) {
      groups.push(toSingleGroup(notif));
      continue;
    }

    /* Cherche un groupe existant compatible : même type + même href, et
       le groupe le plus récent doit être dans la fenêtre 24h par rapport
       à cette notif. */
    const matching = groups.find(
      (g) =>
        g.type === notif.type &&
        g.href === notif.href &&
        Date.parse(g.created_at) - Date.parse(notif.created_at) <
          GROUPING_WINDOW_MS,
    );

    if (matching) {
      mergeIntoGroup(matching, notif);
    } else {
      groups.push(toSingleGroup(notif));
    }
  }

  return groups;
}

function toSingleGroup(notif: NotificationWithActor): GroupedNotification {
  return {
    id: notif.id,
    type: notif.type,
    title: notif.title,
    body: notif.body,
    href: notif.href,
    created_at: notif.created_at,
    read_at: notif.read_at,
    actors: notif.actor ? [notif.actor] : [],
    count: 1,
    notification_ids: [notif.id],
  };
}

function mergeIntoGroup(
  group: GroupedNotification,
  notif: NotificationWithActor,
): void {
  group.count += 1;
  group.notification_ids.push(notif.id);
  /* Garde l'unread si au moins une notif du groupe l'est. */
  if (!notif.read_at) group.read_at = null;
  /* Ajoute l'actor s'il n'est pas déjà dans le groupe. */
  if (notif.actor && !group.actors.some((a) => a.id === notif.actor!.id)) {
    group.actors.push(notif.actor);
  }
  /* Re-construit le title agrégé. */
  group.title = buildGroupTitle(group);
}

function buildGroupTitle(group: GroupedNotification): string {
  const firstName = group.actors[0]?.full_name?.split(" ")[0] ??
    group.actors[0]?.username ?? "Quelqu'un";
  const otherCount = group.count - 1;
  /* Verbes par type — placeholders pour les types futurs (likes, comments,
     bookmarks). Les types actuels (message, friend_request_*) sont dans
     SINGLE_NOTIF_TYPES et ne tombent jamais ici. */
  const verbByType: Record<string, string> = {
    like: "ont aimé",
    comment: "ont commenté",
    bookmark: "ont sauvegardé",
    follow: "te suivent",
    mention: "t'ont mentionné",
    reaction: "ont réagi",
  };
  const verb = verbByType[group.type] ?? "";

  if (otherCount <= 0) {
    return group.title;
  }
  const others = otherCount === 1 ? "1 autre" : `${otherCount} autres`;
  return verb
    ? `${firstName} et ${others} ${verb}.`
    : `${firstName} et ${others} (${group.count} notifications)`;
}
