import { ArrowLeft, Crown, MessageSquare, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { getConversationDetails } from "@/lib/queries/conversations";
import { listFriendsForUser } from "@/lib/queries/friendships";
import { getGroupDetails } from "@/lib/queries/groups";
import { createClient } from "@/lib/supabase/server";
import { LinkBadge } from "../../_components/LinkBadge";
import { AddMemberSection } from "./_components/AddMemberSection";
import { AutoDeleteSection } from "./_components/AutoDeleteSection";
import { GroupSettingsActions } from "./_components/GroupSettingsActions";
import { KickMemberButton } from "./_components/MemberActions";
import { Container } from "@/components/primitives/Container";
import { Stack } from "@/components/primitives/Stack";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Paramètres de la conversation" };

export default async function ConversationSettingsPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const details = await getConversationDetails(id);
  if (!details) notFound();
  const { conversation } = details;
  const isGroup = conversation.type === "group";

  /* Cast auto_delete_after_days vers le type union strict attendu par
     AutoDeleteSection (la DB autorise null + 1/7/30 via CHECK). */
  const autoDeleteDays = (() => {
    const v = conversation.auto_delete_after_days;
    if (v === 1 || v === 7 || v === 30) return v;
    return null;
  })();

  const groupDetails = isGroup ? await getGroupDetails(id, user.id) : null;
  if (isGroup && (!groupDetails || !groupDetails.myRole)) notFound();

  const isOwner = groupDetails?.myRole === "owner";

  /* Pour le bouton "Ajouter des membres" : on précharge la liste d'amis
     pour éviter un round-trip côté client. */
  const friends = isGroup && isOwner ? await listFriendsForUser(user.id) : [];
  const friendsList = friends.map((f) => ({
    id: f.other.id,
    full_name: f.other.full_name,
    username: f.other.username,
    avatar_url: f.other.avatar_url,
  }));
  const existingMemberIds = groupDetails
    ? groupDetails.members.map((m) => m.user_id)
    : [];

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <header className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-line bg-white sticky top-0 z-10">
        <Link
          href={`/messages/${id}`}
          aria-label="Retour"
          className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-night" aria-hidden />
        </Link>
        <div className="flex items-center gap-2">
          {isGroup ? (
            <Users className="w-5 h-5 text-night" aria-hidden />
          ) : (
            <MessageSquare className="w-5 h-5 text-night" aria-hidden />
          )}
          <div>
            <h1 className="font-semibold text-night">
              {isGroup
                ? "Paramètres du groupe"
                : "Paramètres de la conversation"}
            </h1>
            {isGroup && groupDetails ? (
              <p className="text-xs text-muted">
                {groupDetails.members.length} membre
                {groupDetails.members.length > 1 ? "s" : ""}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <Container maxWidth="text" paddingX="lg" paddingY="3xl">
        <Stack gap="2xl">
        {isGroup ? (
          <GroupSettingsActions
            conversationId={id}
            initialName={conversation.name ?? ""}
            initialDescription={conversation.description ?? null}
            isOwner={isOwner}
          />
        ) : null}

        {!isGroup ? (
          <section>
            <header className="px-1 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold-deep" aria-hidden />
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-night-muted">
                Votre lien
              </h2>
            </header>
            <LinkBadge
              linkXp={conversation.link_xp ?? null}
              linkLevel={conversation.link_level ?? null}
              streakDays={conversation.link_streak_days ?? null}
              variant="full"
            />
          </section>
        ) : null}

        <AutoDeleteSection
          conversationId={id}
          initialDays={autoDeleteDays}
        />

        {isGroup && groupDetails ? (
          <section className="rounded-3xl bg-white border border-line p-6 sm:p-7">
            <header className="mb-5">
              <h2 className="font-display text-xl text-night">
                Membres ({groupDetails.members.length})
              </h2>
            </header>
            <ul className="space-y-2">
              {groupDetails.members.map((member) => {
                const profile = member.profile;
                const displayName =
                  profile?.full_name ?? profile?.username ?? "Membre";
                const isMe = member.user_id === user.id;
                const isCreator = member.role === "owner";

                return (
                  <li
                    key={member.user_id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-night/[0.02] border border-line"
                  >
                    <Link
                      href={`/u/${profile?.username ?? ""}`}
                      className="flex items-center gap-3 flex-1 min-w-0 group"
                    >
                      <Avatar
                        src={profile?.avatar_url ?? null}
                        fullName={displayName}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-night truncate group-hover:text-night-soft">
                          {displayName}
                          {isMe ? (
                            <span className="ml-2 text-xs font-normal text-muted">
                              (toi)
                            </span>
                          ) : null}
                        </p>
                        {profile?.username ? (
                          <p className="text-xs text-muted truncate">
                            @{profile.username}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                    {isCreator ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/15 text-gold-deep text-[10px] font-bold uppercase tracking-widest">
                        <Crown className="w-3 h-3" aria-hidden />
                        Créateur
                      </span>
                    ) : null}
                    {!isMe && !isCreator ? (
                      <KickMemberButton
                        conversationId={id}
                        targetUserId={member.user_id}
                        targetName={displayName}
                        isOwner={isOwner}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {/* Bouton "Ajouter des membres" (owner uniquement). */}
            {isOwner ? (
              <div className="mt-3">
                <AddMemberSection
                  conversationId={id}
                  isOwner={isOwner}
                  friends={friendsList}
                  existingMemberIds={existingMemberIds}
                />
              </div>
            ) : null}
          </section>
        ) : null}
        </Stack>
      </Container>
    </div>
  );
}
