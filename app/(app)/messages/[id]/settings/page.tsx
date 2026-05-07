import { ArrowLeft, Crown, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { getGroupDetails } from "@/lib/queries/groups";
import { createClient } from "@/lib/supabase/server";
import { GroupSettingsActions } from "./_components/GroupSettingsActions";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Paramètres du groupe" };

export default async function GroupSettingsPage({
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

  const details = await getGroupDetails(id, user.id);
  if (!details || details.conversation.type !== "group" || !details.myRole) {
    notFound();
  }

  const { conversation, members, myRole } = details;
  const isOwner = myRole === "owner";

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
          <Users className="w-5 h-5 text-night" aria-hidden />
          <div>
            <h1 className="font-semibold text-night">
              Paramètres du groupe
            </h1>
            <p className="text-xs text-muted">
              {members.length} membre{members.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-8 py-8 max-w-2xl mx-auto space-y-6">
        <GroupSettingsActions
          conversationId={id}
          initialName={conversation.name ?? ""}
          isOwner={isOwner}
        />

        <section className="rounded-3xl bg-white border border-line p-6 sm:p-7">
          <header className="mb-5">
            <h2 className="font-display text-xl text-night">
              Membres ({members.length})
            </h2>
          </header>
          <ul className="space-y-2">
            {members.map((member) => {
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
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
