import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import {
  getConversationDetails,
  getMessagesForConversation,
} from "@/lib/queries/conversations";
import { createClient } from "@/lib/supabase/server";
import { MessageComposer } from "../_components/MessageComposer";
import { MessageThread } from "../_components/MessageThread";

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
  const initialMessages = await getMessagesForConversation(id);

  // Mark as read in the background
  await supabase.rpc("mark_conversation_read", { conv_id: id });

  const displayName =
    otherMember?.full_name ?? otherMember?.username ?? conversation.name ?? "Conversation";
  const subtitle = otherMember?.username
    ? `@${otherMember.username}`
    : conversation.type === "direct"
      ? "Conversation directe"
      : "Groupe";

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
        <Avatar
          src={otherMember?.avatar_url ?? conversation.avatar_url}
          fullName={displayName}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-night truncate">{displayName}</h1>
          <p className="text-xs text-muted truncate">{subtitle}</p>
        </div>
      </header>

      <MessageThread
        conversationId={id}
        initialMessages={initialMessages}
        initialOtherLastReadAt={otherLastReadAt}
        currentUserId={user.id}
        otherMember={otherMember
          ? {
              user_id: otherMember.id,
              full_name: otherMember.full_name,
              username: otherMember.username,
              avatar_url: otherMember.avatar_url,
            }
          : null}
      />

      <MessageComposer conversationId={id} senderId={user.id} />
    </>
  );
}
