import { notFound, redirect } from "next/navigation";
import {
  getConversationDetails,
  getMessagesForConversation,
  getReactionsForConversation,
} from "@/lib/queries/conversations";
import { getGroupDetails } from "@/lib/queries/groups";
import { getPresenceForUser } from "@/lib/queries/presence";
import { createClient } from "@/lib/supabase/server";
import { ChatHeader } from "../_components/ChatHeader";
import { ConversationReadRefresher } from "../_components/ConversationReadRefresher";
import { ConversationView } from "../_components/ConversationView";
import { MobileBodyLock } from "../_components/MobileBodyLock";
import { getSecretStatus } from "../secret-actions";

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

  const { conversation, otherMember, otherLastReadAt, myMember } = details;
  const isGroup = conversation.type === "group";

  const groupDetails = isGroup ? await getGroupDetails(id, user.id) : null;
  const [initialMessages, initialReactions, otherPresence, secretStatus] = await Promise.all([
    getMessagesForConversation(id),
    getReactionsForConversation(id),
    !isGroup && otherMember ? getPresenceForUser(otherMember.id) : Promise.resolve(null),
    !isGroup ? getSecretStatus(id) : Promise.resolve(null),
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

  /* Mapping secret badge pour le header :
     - active = les deux ont accepté + peer a une identity_key
     - pending = j'ai accepté mais le peer pas encore (ou pas d'identity)
     - off = pas demandé */
  const secretBadge: "active" | "pending" | "off" = !isGroup && secretStatus
    ? secretStatus.isEffectiveSecret
      ? "active"
      : secretStatus.myWantsSecret
        ? "pending"
        : "off"
    : "off";

  return (
    <>
      {/* Lock body scroll en mobile : empêche iOS de scroller la page
          pour positionner l'input visible quand le clavier ouvre
          (sans ça, ChatHeader + messages sortent hors écran). */}
      <MobileBodyLock />
      {/* Force router.refresh() au mount pour que le layout (TopBar +
          MobileBottomNav avec badges unread) reflète le mark-as-read
          effectué juste au-dessus côté server. */}
      <ConversationReadRefresher />
      <ChatHeader
        conversationId={id}
        displayName={displayName}
        subtitle={fallbackSubtitle}
        avatarUrl={otherMember?.avatar_url ?? conversation.avatar_url}
        isGroup={isGroup}
        otherPresence={!isGroup ? otherPresence : null}
        otherUsername={!isGroup ? otherMember?.username ?? null : null}
        otherUserId={!isGroup ? otherMember?.id ?? null : null}
        isPinned={myMember?.is_pinned ?? false}
        isArchived={myMember?.is_archived ?? false}
        isMuted={myMember?.is_muted ?? false}
        secret={secretBadge}
        themePreset={myMember?.theme_preset ?? null}
        wallpaperId={myMember?.wallpaper_id ?? null}
        linkXp={conversation.link_xp ?? null}
        linkLevel={conversation.link_level ?? null}
        linkStreakDays={conversation.link_streak_days ?? null}
        groupMembers={
          isGroup && groupDetails
            ? groupDetails.members
                .filter((m) => m.profile)
                .map((m) => ({
                  user_id: m.user_id,
                  full_name: m.profile!.full_name,
                  username: m.profile!.username,
                  avatar_url: m.profile!.avatar_url,
                }))
            : undefined
        }
      />

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
        secretContext={
          secretStatus && !isGroup
            ? {
                peerUserId: secretStatus.peerUserId,
                isEffectiveSecret: secretStatus.isEffectiveSecret,
              }
            : null
        }
        themePreset={myMember?.theme_preset ?? null}
        wallpaperId={myMember?.wallpaper_id ?? null}
      />
    </>
  );
}
