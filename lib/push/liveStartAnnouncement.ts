import "server-only";

/* Étape 20 — Helper push : notification "Untel est en direct".
 *
 * Envoyé après startLiveStreamSession(). Destinataires :
 *  - Followers du host (user_follows.followed_id = host_id)
 *  - Amis du host (friendships accepted)
 *
 * Union sans duplicate, max 5000 (limite raisonnable). Skip le host.
 * Respect des prefs notifs : V1 pas de check (push global), V2 ajoutera
 * un toggle "notifs lives" dans /settings/notifications.
 *
 * Idempotence : pas de log de notif côté DB → si un live oscille
 * start/end/start, le user recevra plusieurs push. Acceptable pour V1.
 */

import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "./sender";

type Args = {
  sessionId: string;
  hostId: string;
  hostName: string | null;
  hostUsername: string | null;
  title: string;
  category: string | null;
};

const MAX_RECIPIENTS = 5000;

export async function pushLiveStartToFollowers(args: Args): Promise<void> {
  const supabase = await createClient();

  /* Followers du host. */
  const { data: followers } = await supabase
    .from("user_follows")
    .select("follower_id")
    .eq("followed_id", args.hostId)
    .limit(MAX_RECIPIENTS);

  /* Amis du host (friendships accepted). */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data: friends } = await (supabase as any)
    .from("friendships")
    .select("requester_id, recipient_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${args.hostId},recipient_id.eq.${args.hostId}`)
    .limit(MAX_RECIPIENTS);

  const recipientSet = new Set<string>();
  for (const f of (followers ?? []) as Array<{ follower_id: string }>) {
    if (f.follower_id !== args.hostId) recipientSet.add(f.follower_id);
  }
  for (const fr of (friends ?? []) as Array<{
    requester_id: string;
    recipient_id: string;
  }>) {
    const other =
      fr.requester_id === args.hostId ? fr.recipient_id : fr.requester_id;
    if (other !== args.hostId) recipientSet.add(other);
  }

  if (recipientSet.size === 0) return;

  const recipients = Array.from(recipientSet).slice(0, MAX_RECIPIENTS);
  const hostLabel =
    args.hostName ?? args.hostUsername ?? "Un créateur que tu suis";
  const titleStr = `🔴 ${hostLabel} est en direct !`;
  const body = args.category
    ? `${args.title} · ${args.category}`
    : args.title;

  await sendPushToUsers(recipients, {
    title: titleStr,
    body: body.slice(0, 180),
    url: `/lives/${args.sessionId}`,
    tag: `live:${args.sessionId}:start`,
  });
}
