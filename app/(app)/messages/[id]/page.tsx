import { ArrowLeft, Settings, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import {
  getConversationDetails,
  getMessagesForConversation,
  getReactionsForConversation,
} from "@/lib/queries/conversations";
import { getGroupDetails } from "@/lib/queries/groups";
import { getPresenceForUser } from "@/lib/queries/presence";
import { createClient } from "@/lib/supabase/server";
import { PresenceDot } from "@/components/ui/PresenceDot";
import { PresenceLabel } from "@/components/ui/PresenceLabel";
import { ConversationView } from "../_components/ConversationView";

type Params = Promise<{ id: string }>;

export default async function ConversationPage({ params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const details = await getConversationDetails(id);
  if (!details) notFound();

  const { conversation, otherMember, otherLastReadAt } = details;
  const isGroup = conversation.type === "group";

  const groupDetails = isGroup ? await getGroupDetails(id, user.id) : null;
  const [initialMessages, initialReactions, otherPresence] = await Promise.all([
    getMessagesForConversation(id),
    getReactionsForConversation(id),
    !isGroup && otherMember ? getPresenceForUser(otherMember.id) : Promise.resolve(null),
  ]);

  // Mark as read in the background
  await supabase.rpc("mark_conversation_read", { conv_id: id });

  // Build a member map (id → profile) used by MessageThread for groups
  const memberMap: Record<
    string,
    {
      user_id: string;
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
    }
  > = {};
  if (groupDetails) {
    for (const member of groupDetails.members) {
      if (member.profile) {
        memberMap[member.user_id] = {
          user_id: member.user_id,
          full_name: member.profile.full_name,
          username: member.profile.username,
          avatar_url: member.profile.avatar_url,
        };
      }
    }
  } else if (otherMember) {
    memberMap[otherMember.id] = {
      user_id: otherMember.id,
      full_name: otherMember.full_name,
      username: otherMember.username,
      avatar_url: otherMember.avatar_url,
    };
  }

  const displayName = isGroup
    ? (conversation.name ?? "Groupe")
    : (otherMember?.full_name ?? otherMember?.username ?? "Conversation");
  const fallbackSubtitle = isGroup
    ? `${groupDetails?.members.length ?? 0} membres`
    : otherMember?.username
      ? `@${otherMember.username}`
      : "Conversation directe";

  return (
    <>
      <header className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-line bg-white">
        <Link
          href="/messages"
          aria-label="Retour"
          className="lg:hidden w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-night" aria-hidden />
        </Link>
        <div className="relative shrink-0">
          <Avatar
            src={otherMember?.avatar_url ?? conversation.avatar_url}
            fullName={displayName}
            size="md"
          />
          {!isGroup && otherPresence ? (
            <PresenceDot
              status={otherPresence.presence_status}
              customStatus={otherPresence.custom_status}
              size="md"
              className="absolute bottom-0 right-0"
            />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-night truncate flex items-center gap-1.5">
            {displayName}
            {isGroup ? (
              <Users
                className="w-3.5 h-3.5 text-night-muted shrink-0"
                aria-hidden
              />
            ) : null}
          </h1>
          <p className="text-xs text-muted truncate">
            {!isGroup && otherPresence ? (
              <PresenceLabel presence={otherPresence} fallback={fallbackSubtitle} />
            ) : (
              fallbackSubtitle
            )}
          </p>
        </div>
        {isGroup ? (
          <Link
            href={`/messages/${id}/settings`}
            aria-label="Réglages du groupe"
            className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted hover:text-night"
          >
            <Settings className="w-4 h-4" aria-hidden />
          </Link>
        ) : null}
      </header>

      <ConversationView
        conversationId={id}
        currentUserId={user.id}
        initialMessages={initialMessages}
        initialReactions={initialReactions}
        initialOtherLastReadAt={otherLastReadAt}
        otherMember={otherMember
          ? {
              user_id: otherMember.id,
              full_name: otherMember.full_name,
              username: otherMember.username,
              avatar_url: otherMember.avatar_url,
            }
          : null}
        memberMap={memberMap}
        isGroup={isGroup}
      />
    </>
  );
}
