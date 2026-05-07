import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Conversation, MemberRole, Profile } from "@/lib/database.types";

export type GroupMemberWithProfile = {
  user_id: string;
  role: MemberRole;
  joined_at: string;
  profile: Pick<
    Profile,
    "id" | "full_name" | "username" | "avatar_url"
  > | null;
};

export type GroupDetails = {
  conversation: Conversation;
  members: GroupMemberWithProfile[];
  myRole: MemberRole | null;
};

export async function getGroupDetails(
  conversationId: string,
  currentUserId: string,
): Promise<GroupDetails | null> {
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) return null;

  const { data: members } = await supabase
    .from("conversation_members")
    .select("user_id, role, joined_at")
    .eq("conversation_id", conversationId);

  if (!members) return null;

  const userIds = members.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", userIds);

  const profileById = new Map<
    string,
    Pick<Profile, "id" | "full_name" | "username" | "avatar_url">
  >();
  for (const profile of profiles ?? []) profileById.set(profile.id, profile);

  const enriched: GroupMemberWithProfile[] = members
    .map((member) => ({
      user_id: member.user_id,
      role: member.role as MemberRole,
      joined_at: member.joined_at,
      profile: profileById.get(member.user_id) ?? null,
    }))
    .sort((a, b) => {
      if (a.role === "owner" && b.role !== "owner") return -1;
      if (b.role === "owner" && a.role !== "owner") return 1;
      return a.joined_at.localeCompare(b.joined_at);
    });

  const myMember = members.find((m) => m.user_id === currentUserId);

  return {
    conversation,
    members: enriched,
    myRole: (myMember?.role as MemberRole | undefined) ?? null,
  };
}
