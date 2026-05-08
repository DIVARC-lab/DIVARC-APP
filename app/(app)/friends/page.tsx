import {
  Inbox,
  PaperclipIcon,
  Send,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { createClient } from "@/lib/supabase/server";
import {
  listFriendsForUser,
  listIncomingRequests,
  listOutgoingRequests,
} from "@/lib/queries/friendships";
import { getPresenceForUsers } from "@/lib/queries/presence";
import { FriendCard } from "./_components/FriendCard";
import { KickerLabel } from "@/components/ui/KickerLabel";

export const metadata = {
  title: "Amis",
};

const TABS = [
  { id: "amis", label: "Mes amis", icon: Users },
  { id: "recues", label: "Reçues", icon: Inbox },
  { id: "envoyees", label: "Envoyées", icon: Send },
] as const;

type TabId = (typeof TABS)[number]["id"];
type SearchParams = Promise<{ tab?: string }>;

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { tab } = await searchParams;
  const activeTab: TabId =
    (TABS.find((t) => t.id === tab)?.id as TabId) ?? "amis";

  const [friends, incoming, outgoing] = await Promise.all([
    listFriendsForUser(user.id),
    listIncomingRequests(user.id),
    listOutgoingRequests(user.id),
  ]);

  const friendIds = friends.map((f) => f.other.id);
  const presenceMap = await getPresenceForUsers(friendIds);

  const counts = {
    amis: friends.length,
    recues: incoming.length,
    envoyees: outgoing.length,
  } as const;

  const visibleTabs = TABS.map((tab) => ({
    id: tab.id,
    label:
      counts[tab.id] > 0 ? `${tab.label} · ${counts[tab.id]}` : tab.label,
    icon: tab.icon,
  }));

  return (
    <div className="px-6 sm:px-10 py-10 max-w-5xl mx-auto w-full space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <KickerLabel>Amis</KickerLabel>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
            Ton cercle <em className="italic text-gold-deep">DIVARC</em>.
          </h1>
          <p className="mt-2 text-muted-strong max-w-xl">
            Avant de discuter avec quelqu&apos;un, vous devez être amis. Une
            demande, une réponse, et la conversation s&apos;ouvre
            automatiquement.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/messages/new">
            <UserPlus className="w-4 h-4" aria-hidden />
            Trouver des amis
          </Link>
        </Button>
      </header>

      <Tabs
        tabs={visibleTabs}
        activeId={activeTab}
        pathname="/friends"
        defaultTab="amis"
        paramName="tab"
      />

      <div>
        {activeTab === "amis" ? (
          friends.length === 0 ? (
            <EmptyState
              emoji="🫂"
              title="Pas encore d'amis sur DIVARC"
              body="Trouve des proches pour démarrer ton réseau."
              ctaHref="/messages/new"
              ctaLabel="Trouver des amis"
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {friends.map((friendship) => (
                <FriendCard
                  key={friendship.id}
                  friendship={friendship}
                  variant="friend"
                  presence={presenceMap[friendship.other.id] ?? null}
                />
              ))}
            </div>
          )
        ) : null}

        {activeTab === "recues" ? (
          incoming.length === 0 ? (
            <EmptyState
              emoji="📭"
              title="Aucune demande reçue"
              body="Quand quelqu'un t'enverra une demande d'ami, tu la verras ici."
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {incoming.map((friendship) => (
                <FriendCard
                  key={friendship.id}
                  friendship={friendship}
                  variant="incoming"
                />
              ))}
            </div>
          )
        ) : null}

        {activeTab === "envoyees" ? (
          outgoing.length === 0 ? (
            <EmptyState
              emoji="📤"
              title="Aucune demande envoyée"
              body="Lance une recherche pour trouver des proches."
              ctaHref="/messages/new"
              ctaLabel="Trouver des amis"
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {outgoing.map((friendship) => (
                <FriendCard
                  key={friendship.id}
                  friendship={friendship}
                  variant="outgoing"
                />
              ))}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({
  emoji,
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  emoji: string;
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="text-center py-16 px-6 rounded-3xl bg-white border border-line">
      <div
        aria-hidden
        className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5 text-4xl leading-none"
      >
        {emoji}
      </div>
      <h2 className="font-display text-2xl text-night">{title}</h2>
      <p className="mt-2 text-muted max-w-sm mx-auto">{body}</p>
      {ctaHref && ctaLabel ? (
        <Button asChild className="mt-6">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
