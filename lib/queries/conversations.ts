import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Conversation,
  ConversationListItem,
  Message,
  Profile,
} from "@/lib/database.types";

export async function listConversationsForUser(
  userId: string,
): Promise<ConversationListItem[]> {
  const supabase = await createClient();

  const { data: memberRows, error: memberError } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  if (memberError || !memberRows || memberRows.length === 0) {
    return [];
  }

  const conversationIds = memberRows.map((m) => m.conversation_id);
  const lastReadByConv = new Map(
    memberRows.map((m) => [m.conversation_id, m.last_read_at]),
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

  const otherUserIdsByConv = new Map<string, string>();
  for (const member of allMembers ?? []) {
    if (member.user_id !== userId) {
      otherUserIdsByConv.set(member.conversation_id, member.user_id);
    }
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
    const lastReadAt = lastReadByConv.get(conv.id) ?? conv.created_at;
    const otherUserId = otherUserIdsByConv.get(conv.id) ?? null;
    const otherProfile = otherUserId
      ? profilesByUserId.get(otherUserId) ?? null
      : null;
    const lastMessage = lastMessageByConv.get(conv.id) ?? null;

    const unreadCount =
      lastMessage && new Date(lastMessage.created_at) > new Date(lastReadAt)
        ? 1
        : 0;

    return {
      id: conv.id,
      type: conv.type,
      name: conv.name,
      avatar_url: conv.avatar_url,
      last_message_at: conv.last_message_at,
      last_read_at: lastReadAt,
      unread_count: unreadCount,
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
          }
        : null,
    };
  });

  return items;
}

export async function getConversationDetails(
  conversationId: string,
): Promise<{
  conversation: Conversation;
  otherMember: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
  otherLastReadAt: string | null;
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

  const { data: members } = await supabase
    .from("conversation_members")
    .select("user_id, last_read_at")
    .eq("conversation_id", conversationId);

  const otherEntry = members?.find((m) => m.user_id !== user.id);
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

  return {
    conversation,
    otherMember,
    otherLastReadAt: otherEntry?.last_read_at ?? null,
  };
}

export async function getMessagesForConversation(
  conversationId: string,
  limit: number = 100,
): Promise<Message[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return [...data].reverse();
}

export async function getTotalUnreadCount(userId: string): Promise<number> {
  const conversations = await listConversationsForUser(userId);
  return conversations.reduce((sum, c) => sum + c.unread_count, 0);
}
