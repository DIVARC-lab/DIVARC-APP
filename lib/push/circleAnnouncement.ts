import "server-only";

/* Sprint D.3 — Helper push pour les posts dans un channel announcement.
 *
 * Filtre :
 *   - channel.channel_type doit être 'announcement'
 *   - members.status = 'active' && !is_banned
 *   - circle_notification_preferences.mode != 'muted'
 *   - skip l'auteur
 *
 * Fait via RPC SECURITY DEFINER pour bypass RLS de circle_members lus
 * cross-user. */

import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "./sender";

type Args = {
  circleId: string;
  circleSlug: string | null;
  circleName: string | null;
  channelId: string;
  authorId: string;
  postId: string | null;
  body: string;
};

export async function pushAnnouncementToCircleMembers(args: Args): Promise<void> {
  const supabase = await createClient();

  /* Check : channel = announcement ? */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data: channel } = await (supabase as any)
    .from("circle_channels")
    .select("channel_type, name")
    .eq("id", args.channelId)
    .maybeSingle();
  if (!channel) return;
  const c = channel as { channel_type?: string; name?: string };
  if (c.channel_type !== "announcement") return;

  /* Récupère les destinataires en respectant les prefs cercle (mute /
     mentions_only). On lit tous les membres actifs, puis on filtre par
     mode != 'muted' et mode != 'mentions_only'. */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data: members } = await (supabase as any)
    .from("circle_members")
    .select("user_id, status, is_banned")
    .eq("circle_id", args.circleId)
    .eq("status", "active")
    .eq("is_banned", false);

  const memberIds = (
    (members ?? []) as Array<{ user_id: string }>
  )
    .map((m) => m.user_id)
    .filter((id) => id !== args.authorId);
  if (memberIds.length === 0) return;

  /* Filter par prefs : on lit toutes les lignes pour ces users dans ce
     cercle. Absence de ligne = défaut 'all'. */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data: prefs } = await (supabase as any)
    .from("circle_notification_preferences")
    .select("user_id, mode")
    .eq("circle_id", args.circleId)
    .in("user_id", memberIds);

  const modeByUser = new Map<string, string>();
  for (const p of (prefs ?? []) as Array<{
    user_id: string;
    mode: string;
  }>) {
    modeByUser.set(p.user_id, p.mode);
  }

  const recipientIds = memberIds.filter((uid) => {
    const mode = modeByUser.get(uid) ?? "all";
    /* Mode all = ok. mentions_only = pas une mention donc skip. muted = skip. */
    return mode === "all";
  });

  if (recipientIds.length === 0) return;

  const channelName = c.name ?? "annonces";
  const title = args.circleName
    ? `📢 ${args.circleName} · #${channelName}`
    : `📢 #${channelName}`;
  const previewBody = args.body.slice(0, 180);
  const url =
    args.circleSlug && args.postId
      ? `/circles/${args.circleSlug}/posts/${args.postId}`
      : args.circleSlug
        ? `/circles/${args.circleSlug}`
        : "/";

  await sendPushToUsers(recipientIds, {
    title,
    body: previewBody,
    url,
    tag: `circle:${args.circleId}:announcement`,
  });
}
