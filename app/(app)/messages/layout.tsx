import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listConversationsForUser } from "@/lib/queries/conversations";
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

  const conversations = await listConversationsForUser(user.id);

  const otherMemberIds = conversations
    .map((c) => c.other_member?.user_id)
    .filter((id): id is string => Boolean(id));
  const presenceMap = await getPresenceForUsers(otherMemberIds);

  return (
    <MessagesLayoutWrapper
      sidebar={
        <ConversationListSidebar
          conversations={conversations}
          currentUserId={user.id}
          presenceMap={presenceMap}
        />
      }
    >
      {children}
    </MessagesLayoutWrapper>
  );
}
