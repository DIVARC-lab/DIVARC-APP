/* lib/queries/circleChat.ts — accès données chat de groupe cercles.
 *
 * Toutes les fonctions sont server-side (createClient supabase/server).
 * RLS garantit que seuls les membres actifs voient/écrivent. */

import { createClient } from "@/lib/supabase/server";
import type {
  CircleChatMessage,
  CircleChatMessageWithAuthor,
  Profile,
} from "@/lib/database.types";

/* Cast helper : les types Supabase générés ne contiennent pas encore
 * circle_chat_messages / circle_chat_reactions (regen manuelle pending).
 * RLS sécurise les accès au runtime. */
/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

const PAGE_SIZE = 50;

type ProfileLite = Pick<Profile, "id" | "full_name" | "username" | "avatar_url">;

/* Liste paginée des derniers messages d'un cercle (ordre chrono ASC à
 * la fin pour affichage feed). `before` = cursor sur created_at pour
 * load more older. */
export async function listCircleChatMessages(
  circleId: string,
  opts: { before?: string | null; limit?: number } = {},
): Promise<CircleChatMessageWithAuthor[]> {
  const supabase = await createClient();
  const limit = opts.limit ?? PAGE_SIZE;

  let query = (supabase as SupabaseAny)
    .from("circle_chat_messages")
    .select("*")
    .eq("circle_id", circleId)
    .is("deleted_at", null)
    .is("parent_message_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts.before) {
    query = query.lt("created_at", opts.before);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  const rows = data as CircleChatMessage[];

  /* Enrichir avec auteurs + reactions summary + replies_count. */
  const authorIds = Array.from(
    new Set(rows.map((m) => m.author_id).filter(Boolean) as string[]),
  );

  if (authorIds.length === 0) return rows.reverse() as CircleChatMessageWithAuthor[];

  const messageIds = rows.map((m) => m.id);

  /* Récupère aussi les bots qui ont posté des messages (bot_id défini). */
  const botIds = Array.from(
    new Set(rows.map((m) => (m as { bot_id?: string }).bot_id).filter(Boolean) as string[]),
  );

  const [{ data: authors }, { data: reactions }, { data: repliesAgg }, { data: bots }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", authorIds),
      (supabase as SupabaseAny)
        .from("circle_chat_reactions")
        .select("message_id, emoji, user_id")
        .in("message_id", messageIds),
      (supabase as SupabaseAny)
        .from("circle_chat_messages")
        .select("parent_message_id")
        .in("parent_message_id", messageIds)
        .is("deleted_at", null),
      botIds.length > 0
        ? (supabase as SupabaseAny)
            .from("circle_bots")
            .select("id, name, avatar_url, bot_type")
            .in("id", botIds)
        : Promise.resolve({ data: [] }),
    ]);

  const authorById = new Map<string, ProfileLite>();
  for (const a of (authors ?? []) as ProfileLite[]) authorById.set(a.id, a);

  /* Auth user pour my_reactions. */
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  const reactionsByMsg = new Map<string, { summary: Record<string, number>; mine: string[] }>();
  for (const r of (reactions ?? []) as Array<{
    message_id: string;
    emoji: string;
    user_id: string;
  }>) {
    const slot = reactionsByMsg.get(r.message_id) ?? {
      summary: {},
      mine: [] as string[],
    };
    slot.summary[r.emoji] = (slot.summary[r.emoji] ?? 0) + 1;
    if (r.user_id === currentUserId) slot.mine.push(r.emoji);
    reactionsByMsg.set(r.message_id, slot);
  }

  const repliesCountByParent = new Map<string, number>();
  for (const row of (repliesAgg ?? []) as Array<{ parent_message_id: string }>) {
    repliesCountByParent.set(
      row.parent_message_id,
      (repliesCountByParent.get(row.parent_message_id) ?? 0) + 1,
    );
  }

  /* Index bots par id. */
  const botById = new Map<
    string,
    { id: string; name: string; avatar_url: string | null; bot_type: string }
  >();
  for (const b of (bots ?? []) as Array<{
    id: string;
    name: string;
    avatar_url: string | null;
    bot_type: string;
  }>) {
    botById.set(b.id, b);
  }

  /* On inverse pour retourner chronologique ASC (bottom = plus récent). */
  return rows
    .map((m) => {
      const botId = (m as { bot_id?: string | null }).bot_id ?? null;
      return {
        ...m,
        author: m.author_id ? authorById.get(m.author_id) ?? null : null,
        bot: botId ? botById.get(botId) ?? null : null,
        reactions_summary: reactionsByMsg.get(m.id)?.summary ?? {},
        my_reactions: reactionsByMsg.get(m.id)?.mine ?? [],
        replies_count: repliesCountByParent.get(m.id) ?? 0,
      };
    })
    .reverse() as CircleChatMessageWithAuthor[];
}

/* Replies d'un message thread (ordre chrono ASC). */
export async function listCircleChatReplies(
  parentMessageId: string,
): Promise<CircleChatMessageWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny)
    .from("circle_chat_messages")
    .select("*")
    .eq("parent_message_id", parentMessageId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  const rows = data as CircleChatMessage[];

  const authorIds = Array.from(
    new Set(rows.map((m) => m.author_id).filter(Boolean) as string[]),
  );
  if (authorIds.length === 0) return rows as CircleChatMessageWithAuthor[];

  const { data: authors } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", authorIds);

  const authorById = new Map<string, ProfileLite>();
  for (const a of (authors ?? []) as ProfileLite[]) authorById.set(a.id, a);

  return rows.map((m) => ({
    ...m,
    author: m.author_id ? authorById.get(m.author_id) ?? null : null,
  })) as CircleChatMessageWithAuthor[];
}
