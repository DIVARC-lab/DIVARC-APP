import { Inbox, Network, Send } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs } from "@/components/ui/Tabs";
import {
  listIncomingProRequests,
  listMyProConnections,
  listOutgoingProRequests,
} from "@/lib/queries/proConnections";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils/relativeTime";
import { ConnectionRespondActions } from "./_components/ConnectionRespondActions";
import { ConnectionDeleteButton } from "./_components/ConnectionDeleteButton";
import { KickerLabel } from "@/components/ui/KickerLabel";

export const metadata = {
  title: "Réseau pro",
};

const TABS = [
  { id: "relations", label: "Relations", icon: Network },
  { id: "recues", label: "Reçues", icon: Inbox },
  { id: "envoyees", label: "Envoyées", icon: Send },
] as const;

type TabId = (typeof TABS)[number]["id"];
type SearchParams = Promise<{ tab?: string }>;

export default async function NetworkPage({
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
    (TABS.find((t) => t.id === tab)?.id as TabId) ?? "relations";

  const [connections, incoming, outgoing] = await Promise.all([
    listMyProConnections(user.id),
    listIncomingProRequests(user.id),
    listOutgoingProRequests(user.id),
  ]);

  const counts = {
    relations: connections.length,
    recues: incoming.length,
    envoyees: outgoing.length,
  } as const;

  const visibleTabs = TABS.map((t) => ({
    id: t.id,
    label:
      counts[t.id] > 0 ? `${t.label} · ${counts[t.id]}` : t.label,
    icon: t.icon,
  }));

  return (
    <div className="px-6 sm:px-10 py-10 max-w-5xl mx-auto w-full space-y-8">
      <header>
        <KickerLabel>Réseau pro</KickerLabel>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
          Tes <em className="italic text-gold-deep">relations professionnelles</em>.
        </h1>
        <p className="mt-2 text-muted-strong max-w-xl">
          Distinct des amitiés sociales. Pour les ex-collègues, clients,
          partenaires. Visible sur ton profil pro et utilisé pour les
          recommandations.
        </p>
      </header>

      <Tabs
        tabs={visibleTabs}
        activeId={activeTab}
        pathname="/network"
        defaultTab="relations"
        paramName="tab"
      />

      {activeTab === "relations" ? (
        connections.length === 0 ? (
          <EmptyState
            icon={Network}
            title="Pas encore de relation pro"
            body="Sur un profil utilisateur, clique sur « Se connecter » pour démarrer."
          />
        ) : (
          <ul className="grid sm:grid-cols-2 gap-4">
            {connections.map((c) => (
              <li key={c.id}>
                <ConnectionCard
                  connection={c}
                  variant="connected"
                  currentUserId={user.id}
                />
              </li>
            ))}
          </ul>
        )
      ) : null}

      {activeTab === "recues" ? (
        incoming.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Aucune demande reçue"
            body="Quand quelqu'un voudra rejoindre ton réseau pro, tu le verras ici."
          />
        ) : (
          <ul className="grid sm:grid-cols-2 gap-4">
            {incoming.map((c) => (
              <li key={c.id}>
                <ConnectionCard
                  connection={c}
                  variant="incoming"
                  currentUserId={user.id}
                />
              </li>
            ))}
          </ul>
        )
      ) : null}

      {activeTab === "envoyees" ? (
        outgoing.length === 0 ? (
          <EmptyState
            icon={Send}
            title="Aucune demande envoyée"
            body="Visite un profil et clique sur « Se connecter »."
          />
        ) : (
          <ul className="grid sm:grid-cols-2 gap-4">
            {outgoing.map((c) => (
              <li key={c.id}>
                <ConnectionCard
                  connection={c}
                  variant="outgoing"
                  currentUserId={user.id}
                />
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

const CONTEXT_LABELS: Record<string, string> = {
  colleague: "Collègue",
  manager: "Manager",
  report: "Subordonné",
  client: "Client",
  partner: "Partenaire",
  other: "Autre",
};

function ConnectionCard({
  connection,
  variant,
  currentUserId: _currentUserId,
}: {
  connection: Awaited<ReturnType<typeof listMyProConnections>>[number];
  variant: "connected" | "incoming" | "outgoing";
  currentUserId: string;
}) {
  const profile = connection.other;
  const displayName = profile.full_name ?? profile.username ?? "Membre";

  return (
    <article className="p-5 rounded-3xl bg-white border border-line shadow-soft">
      <div className="flex items-start gap-3">
        <Link
          href={profile.username ? `/u/${profile.username}` : "#"}
          className="shrink-0"
        >
          <Avatar src={profile.avatar_url} fullName={displayName} size="lg" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={profile.username ? `/u/${profile.username}` : "#"}
            className="block font-display text-lg text-night hover:underline truncate"
          >
            {displayName}
          </Link>
          {profile.headline ? (
            <p className="text-sm text-night-muted truncate">
              {profile.headline}
            </p>
          ) : profile.username ? (
            <p className="text-sm text-muted truncate">@{profile.username}</p>
          ) : null}
          {connection.context ? (
            <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-night/5 text-[10px] font-bold uppercase tracking-widest text-night-muted">
              {CONTEXT_LABELS[connection.context]}
            </span>
          ) : null}
          {connection.intro ? (
            <blockquote className="mt-2 p-3 rounded-2xl bg-night/[0.03] border border-line text-xs text-night-muted leading-relaxed line-clamp-3">
              « {connection.intro} »
            </blockquote>
          ) : null}
          <p className="mt-2 text-[11px] text-muted">
            {variant === "connected"
              ? `Connectés ${formatRelative(connection.responded_at ?? connection.created_at)}`
              : variant === "incoming"
                ? `Reçue ${formatRelative(connection.created_at)}`
                : `Envoyée ${formatRelative(connection.created_at)}`}
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        {variant === "incoming" ? (
          <ConnectionRespondActions connectionId={connection.id} />
        ) : null}
        {variant === "outgoing" ? (
          <ConnectionDeleteButton
            connectionId={connection.id}
            label="Annuler"
          />
        ) : null}
        {variant === "connected" ? (
          <ConnectionDeleteButton
            connectionId={connection.id}
            label="Retirer"
          />
        ) : null}
      </div>
    </article>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Network;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center py-16 px-6 rounded-3xl bg-white border border-line">
      <div
        aria-hidden
        className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5"
      >
        <Icon className="w-7 h-7 text-gold-deep" aria-hidden />
      </div>
      <h2 className="font-display text-2xl text-night">{title}</h2>
      <p className="mt-2 text-muted max-w-sm mx-auto">{body}</p>
    </div>
  );
}
