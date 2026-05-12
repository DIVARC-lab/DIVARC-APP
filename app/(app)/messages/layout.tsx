import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listConversationsForUser } from "@/lib/queries/conversations";
import { listRecentCallsForUser } from "@/lib/queries/calls";
import { getPresenceForUsers } from "@/lib/queries/presence";
import { ConversationListSidebar } from "./_components/ConversationListSidebar";
import { MessagesLayoutWrapper } from "./_components/MessagesLayoutWrapper";

export const metadata = {
  title: "Discussions",
};

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [conversations, recentCalls] = await Promise.all([
    listConversationsForUser(user.id),
    listRecentCallsForUser(user.id, 50),
  ]);

  const otherMemberIds = conversations
    .map((c) => c.other_member?.user_id)
    .filter((id): id is string => Boolean(id));
  const presenceMap = await getPresenceForUsers(otherMemberIds);

  /* Compteur d'appels manqués → badge sur l'onglet Appels. */
  const missedCount = recentCalls.filter(
    (c) => c.is_missed && !c.is_outgoing,
  ).length;

  return (
    <MessagesLayoutWrapper
      sidebar={
        <ConversationListSidebar
          conversations={conversations}
          currentUserId={user.id}
          presenceMap={presenceMap}
          recentCalls={recentCalls}
          missedCallsCount={missedCount}
        />
      }
    >
      {children}
    </MessagesLayoutWrapper>
  );
}
