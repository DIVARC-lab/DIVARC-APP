import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Conversation,
  ConversationListItem,
  Message,
  MessageReactionSummary,
  Profile,
} from "@/lib/database.types";

export async function listConversationsForUser(
  userId: string,
): Promise<ConversationListItem[]> {
  const supabase = await createClient();

  const { data: memberRows, error: memberError } = await supabase
    .from("conversation_members")
    .select(
      "conversation_id, last_read_at, is_pinned, is_archived, is_muted, mute_until, wants_secret",
    )
    .eq("user_id", userId);

  if (memberError || !memberRows || memberRows.length === 0) {
    return [];
  }

  const conversationIds = memberRows.map((m) => m.conversation_id);
  type MemberFlags = {
    last_read_at: string;
    is_pinned: boolean;
    is_archived: boolean;
    is_muted: boolean;
    mute_until: string | null;
    wants_secret: boolean;
  };
  const memberFlagsByConv = new Map<string, MemberFlags>(
    memberRows.map((m) => [
      m.conversation_id,
      {
        last_read_at: m.last_read_at,
        is_pinned: m.is_pinned ?? false,
        is_archived: m.is_archived ?? false,
        is_muted: m.is_muted ?? false,
        mute_until: m.mute_until ?? null,
        wants_secret: m.wants_secret ?? false,
      },
    ]),
  );

  const { data: conversations, error: convError } = await supabase
    .from("conversations")
    .select("*")
    .in("id", conversationIds)
    .order("last_message_at", { ascending: false });

  if (convError || !conversations) return [];

  const { data: allMembers } = await supabase
    .from("conversation_members")
    .select("conversation_id, user_id")
    .in("conversation_id", conversationIds);

  // For direct conversations only, find the single "other" member.
  const conversationTypeById = new Map(
    conversations.map((c) => [c.id, c.type]),
  );
  const otherUserIdsByConv = new Map<string, string>();
  for (const member of allMembers ?? []) {
    if (member.user_id === userId) continue;
    if (conversationTypeById.get(member.conversation_id) !== "direct") continue;
    otherUserIdsByConv.set(member.conversation_id, member.user_id);
  }

  const otherUserIds = Array.from(new Set(otherUserIdsByConv.values()));

  const profilesByUserId = new Map<string, Pick<Profile, "id" | "full_name" | "username" | "avatar_url">>();
  if (otherUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", otherUserIds);
    for (const profile of profiles ?? []) {
      profilesByUserId.set(profile.id, profile);
    }
  }

  const lastMessageByConv = new Map<string, Message>();
  if (conversationIds.length > 0) {
    const { data: lastMessages } = await supabase
      .from("messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    for (const message of lastMessages ?? []) {
      if (!lastMessageByConv.has(message.conversation_id)) {
        lastMessageByConv.set(message.conversation_id, message);
      }
    }
  }

  const items: ConversationListItem[] = conversations.map((conv) => {
    const flags = memberFlagsByConv.get(conv.id);
    const lastReadAt = flags?.last_read_at ?? conv.created_at;
    const otherUserId = otherUserIdsByConv.get(conv.id) ?? null;
    const otherProfile = otherUserId
      ? profilesByUserId.get(otherUserId) ?? null
      : null;
    const lastMessage = lastMessageByConv.get(conv.id) ?? null;

    const unreadCount =
      lastMessage && new Date(lastMessage.created_at) > new Date(lastReadAt)
        ? 1
        : 0;

    /* Mute_until expiré → on traite comme non-muted côté affichage. */
    const muteUntil = flags?.mute_until ?? null;
    const stillMuted = muteUntil
      ? new Date(muteUntil).getTime() > Date.now()
      : (flags?.is_muted ?? false);

    return {
      id: conv.id,
      type: conv.type,
      name: conv.name,
      avatar_url: conv.avatar_url,
      last_message_at: conv.last_message_at,
      last_read_at: lastReadAt,
      unread_count: unreadCount,
      is_pinned: flags?.is_pinned ?? false,
      is_archived: flags?.is_archived ?? false,
      is_muted: stillMuted,
      mute_until: muteUntil,
      wants_secret: flags?.wants_secret ?? false,
      other_member: otherProfile
        ? {
            user_id: otherProfile.id,
            full_name: otherProfile.full_name,
            username: otherProfile.username,
            avatar_url: otherProfile.avatar_url,
          }
        : null,
      last_message: lastMessage
        ? {
            body: lastMessage.body,
            sender_id: lastMessage.sender_id,
            created_at: lastMessage.created_at,
            attachment_type: lastMessage.attachment_type,
            is_secret: lastMessage.is_secret ?? false,
          }
        : null,
    };
  });

  /* Tri canonique : épinglés d'abord (par last_message_at desc), puis
     reste (par last_message_at desc). Les archivés gardent ce tri mais
     sont filtrés par défaut au niveau de la sidebar. */
  items.sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return (
      new Date(b.last_message_at).getTime() -
      new Date(a.last_message_at).getTime()
    );
  });

  return items;
}

export async function getConversationDetails(
  conversationId: string,
): Promise<{
  conversation: Conversation;
  otherMember: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
  otherLastReadAt: string | null;
  /* Flags par-membre pour l'utilisateur courant (Chantier 1.4 header). */
  myMember: {
    is_pinned: boolean;
    is_archived: boolean;
    is_muted: boolean;
    mute_until: string | null;
    wants_secret: boolean;
    nickname: string | null;
    /* Chantier 3 : thème personnalisé. */
    theme_preset: string | null;
    wallpaper_id: string | null;
  } | null;
} | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (convError || !conversation) return null;

  /* Tentative avec les colonnes Chantier 3 (theme_preset, wallpaper_id).
     Si la migration 0077 n'a pas été appliquée, ces colonnes n'existent
     pas → la requête échoue. Fallback avec la liste de colonnes
     pré-Chantier-3 pour éviter de crasher la page entière. */
  let members:
    | Array<{
        user_id: string;
        last_read_at: string;
        is_pinned: boolean | null;
        is_archived: boolean | null;
        is_muted: boolean | null;
        mute_until: string | null;
        wants_secret: boolean | null;
        nickname: string | null;
        theme_preset?: string | null;
        wallpaper_id?: string | null;
      }>
    | null = null;
  {
    const withThemeCols = await supabase
      .from("conversation_members")
      .select(
        "user_id, last_read_at, is_pinned, is_archived, is_muted, mute_until, wants_secret, nickname, theme_preset, wallpaper_id",
      )
      .eq("conversation_id", conversationId);
    if (withThemeCols.error) {
      console.warn(
        "[getConversationDetails] theme columns missing, retrying without:",
        withThemeCols.error.message,
      );
      const fallback = await supabase
        .from("conversation_members")
        .select(
          "user_id, last_read_at, is_pinned, is_archived, is_muted, mute_until, wants_secret, nickname",
        )
        .eq("conversation_id", conversationId);
      members = fallback.data;
    } else {
      members = withThemeCols.data;
    }
  }

  const otherEntry = members?.find((m) => m.user_id !== user.id);
  const myEntry = members?.find((m) => m.user_id === user.id);
  let otherMember: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null =
    null;

  if (otherEntry) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .eq("id", otherEntry.user_id)
      .maybeSingle();
    otherMember = profile ?? null;
  }

  /* Normalisation mute_until expiré → considéré non-muted. */
  const muteUntil = myEntry?.mute_until ?? null;
  const stillMuted = muteUntil
    ? new Date(muteUntil).getTime() > Date.now()
    : (myEntry?.is_muted ?? false);

  return {
    conversation,
    otherMember,
    otherLastReadAt: otherEntry?.last_read_at ?? null,
    myMember: myEntry
      ? {
          is_pinned: myEntry.is_pinned ?? false,
          is_archived: myEntry.is_archived ?? false,
          is_muted: stillMuted,
          mute_until: muteUntil,
          wants_secret: myEntry.wants_secret ?? false,
          nickname: myEntry.nickname ?? null,
          theme_preset: myEntry.theme_preset ?? null,
          wallpaper_id: myEntry.wallpaper_id ?? null,
        }
      : null,
  };
}

export async function getMessagesForConversation(
  conversationId: string,
  limit: number = 100,
): Promise<Message[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  /* Filtre les messages expirés (expires_at < now) côté serveur. Le
     soft-delete via purge_expired_messages tourne en cron, mais sur les
     vues live on filtre quand même pour éviter le flash de message
     expiré entre 2 ticks du cron. */
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return [...data].reverse();
}

export async function getReactionsForConversation(
  conversationId: string,
): Promise<Record<string, MessageReactionSummary[]>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from("message_reactions")
    .select("message_id, emoji, user_id")
    .eq("conversation_id", conversationId);

  if (error || !data) return {};

  const aggregated = new Map<string, Map<string, { count: number; userReacted: boolean }>>();

  for (const row of data) {
    let perMessage = aggregated.get(row.message_id);
    if (!perMessage) {
      perMessage = new Map();
      aggregated.set(row.message_id, perMessage);
    }
    const entry = perMessage.get(row.emoji) ?? { count: 0, userReacted: false };
    entry.count += 1;
    if (row.user_id === user.id) entry.userReacted = true;
    perMessage.set(row.emoji, entry);
  }

  const result: Record<string, MessageReactionSummary[]> = {};
  for (const [messageId, perMessage] of aggregated.entries()) {
    result[messageId] = Array.from(perMessage.entries())
      .map(([emoji, { count, userReacted }]) => ({
        emoji,
        count,
        user_reacted: userReacted,
      }))
      .sort((a, b) => b.count - a.count);
  }
  return result;
}

export async function getTotalUnreadCount(userId: string): Promise<number> {
  const conversations = await listConversationsForUser(userId);
  return conversations.reduce((sum, c) => sum + c.unread_count, 0);
}
