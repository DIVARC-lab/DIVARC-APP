import {
  Eye,
  Inbox,
  Network,
  Send,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { suggestPeople } from "@/lib/queries/explore";
import {
  listIncomingProRequests,
  listMyProConnections,
  listOutgoingProRequests,
} from "@/lib/queries/proConnections";
import { countMyProfileViews } from "@/lib/queries/profileViews";
import { createClient } from "@/lib/supabase/server";
import { ConnectionRespondActions } from "./_components/ConnectionRespondActions";
import { ConnectionDeleteButton } from "./_components/ConnectionDeleteButton";
import { Container } from "@/components/primitives/Container";

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

  const [connections, incoming, outgoing, profileViews, suggestions] =
    await Promise.all([
      listMyProConnections(user.id),
      listIncomingProRequests(user.id),
      listOutgoingProRequests(user.id),
      countMyProfileViews(user.id),
      suggestPeople(user.id, 6),
    ]);

  const counts = {
    relations: connections.length,
    recues: incoming.length,
    envoyees: outgoing.length,
  } as const;

  const visibleTabs = TABS.map((t) => ({
    id: t.id,
    label: counts[t.id] > 0 ? `${t.label} · ${counts[t.id]}` : t.label,
    icon: t.icon,
  }));

  return (
    <div className="bg-bg min-h-screen pb-24">
      <Container maxWidth="default" paddingX="none">
        {/* Hero header */}
        <header className="relative overflow-hidden bg-gradient-to-b from-cream to-bg px-5 sm:px-8 pt-10 pb-7">
          <div
            aria-hidden
            className="absolute -right-12 -top-16 opacity-40 pointer-events-none"
          >
            <ArcDeco size={240} tone="gold" opacity={1} stroke={1.25} />
          </div>
          <div className="relative">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
              · Réseau pro
            </p>
            <h1 className="mt-2 font-display text-[36px] sm:text-[48px] font-normal leading-[1.05] tracking-[-0.02em] text-night text-balance">
              Tes{" "}
              <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
                relations
              </em>{" "}
              professionnelles.
            </h1>
            <p className="mt-3 max-w-md text-[14px] text-night-soft leading-relaxed">
              Distinct des amitiés sociales. Pour les ex-collègues, clients,
              partenaires. Visible sur ton profil pro.
            </p>
          </div>
        </header>

        {/* Stats grid */}
        <section
          aria-label="Statistiques réseau"
          className="px-5 sm:px-8 pt-5 grid grid-cols-3 gap-2.5"
        >
          <StatTile
            icon={Network}
            label="Relations"
            value={counts.relations}
            color="navy"
          />
          <StatTile
            icon={Inbox}
            label="En attente"
            value={counts.recues}
            color="gold"
            highlight={counts.recues > 0}
          />
          <StatTile
            icon={Eye}
            label="Vues du profil"
            value={profileViews}
            color="muted"
          />
        </section>

        {/* Tabs */}
        <div className="px-5 sm:px-8 pt-6">
          <Tabs
            tabs={visibleTabs}
            activeId={activeTab}
            pathname="/network"
            defaultTab="relations"
            paramName="tab"
          />
        </div>

        {/* Tab content */}
        <div className="px-5 sm:px-8 pt-6">
          {activeTab === "relations" ? (
            connections.length === 0 ? (
              <EmptyState
                icon={Network}
                kicker="Réseau pro"
                title="Pas encore de relation pro"
                body="Sur un profil utilisateur, clique sur « Se connecter » pour démarrer."
              />
            ) : (
              <ul className="grid sm:grid-cols-2 gap-3">
                {connections.map((c) => (
                  <li key={c.id}>
                    <ConnectionCard
                      connection={c}
                      variant="connected"
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
                kicker="Demandes reçues"
                title="Aucune demande reçue"
                body="Quand quelqu'un voudra rejoindre ton réseau pro, tu le verras ici."
              />
            ) : (
              <ul className="grid sm:grid-cols-2 gap-3">
                {incoming.map((c) => (
                  <li key={c.id}>
                    <ConnectionCard
                      connection={c}
                      variant="incoming"
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
                kicker="Demandes envoyées"
                title="Aucune demande envoyée"
                body="Visite un profil et clique sur « Se connecter »."
              />
            ) : (
              <ul className="grid sm:grid-cols-2 gap-3">
                {outgoing.map((c) => (
                  <li key={c.id}>
                    <ConnectionCard
                      connection={c}
                      variant="outgoing"
                    />
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </div>

        {/* Suggestions section */}
        {suggestions.length > 0 ? (
          <section className="px-5 sm:px-8 pt-10">
            <div className="mb-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
                · À découvrir
              </p>
              <h2 className="mt-1 font-display italic text-[24px] sm:text-[28px] text-night leading-tight">
                Personnes à connecter
              </h2>
            </div>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <SuggestionCard suggestion={s} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Container>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  color,
  highlight,
}: {
  icon: typeof Network;
  label: string;
  value: number;
  color: "navy" | "gold" | "muted";
  highlight?: boolean;
}) {
  const valueColor =
    color === "gold"
      ? "text-gold-deep"
      : color === "muted"
        ? "text-night-muted"
        : "text-night";
  return (
    <div
      className={
        highlight
          ? "rounded-[14px] bg-gold/[0.08] border border-gold/30 p-3"
          : "rounded-[14px] bg-white border border-line p-3"
      }
    >
      <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-night-dim">
        <Icon className="w-3 h-3" aria-hidden />
        {label}
      </div>
      <p
        className={`mt-1 font-display italic text-[24px] sm:text-[28px] leading-none ${valueColor}`}
      >
        {value}
      </p>
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
}: {
  connection: Awaited<ReturnType<typeof listMyProConnections>>[number];
  variant: "connected" | "incoming" | "outgoing";
}) {
  const profile = connection.other;
  const displayName = profile.full_name ?? profile.username ?? "Membre";

  return (
    <article className="p-4 rounded-[18px] bg-white border border-line">
      <div className="flex items-start gap-3">
        <Link
          href={`/u/${profile.username ?? ""}`}
          aria-label={displayName}
          className="shrink-0"
        >
          <Avatar
            src={profile.avatar_url}
            fullName={displayName}
            size="md-bold"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/u/${profile.username ?? ""}`}
            className="block font-bold text-[14px] text-night truncate hover:text-gold-deep transition-colors"
          >
            {displayName}
          </Link>
          {profile.headline ? (
            <p className="mt-0.5 text-[12px] text-night-soft truncate">
              {profile.headline}
            </p>
          ) : null}
          <p className="mt-1.5 inline-flex items-center gap-2 text-[10px] text-night-dim">
            <span className="px-1.5 py-0.5 rounded-md bg-night/[0.06] font-extrabold uppercase tracking-[0.06em]">
              {CONTEXT_LABELS[connection.context ?? "other"] ?? "Connexion"}
            </span>
          </p>
        </div>
      </div>
      {variant === "incoming" ? (
        <div className="mt-3">
          <ConnectionRespondActions connectionId={connection.id} />
        </div>
      ) : null}
      {variant === "connected" ? (
        <div className="mt-3 flex justify-end">
          <ConnectionDeleteButton
            connectionId={connection.id}
            label="Retirer"
          />
        </div>
      ) : null}
    </article>
  );
}

function SuggestionCard({
  suggestion,
}: {
  suggestion: Awaited<ReturnType<typeof suggestPeople>>[number];
}) {
  const displayName =
    suggestion.full_name ?? suggestion.username ?? "Membre";

  return (
    <article className="p-3.5 rounded-[14px] bg-white border border-line hover:border-gold/40 transition-colors">
      <div className="flex items-center gap-3">
        <Link
          href={`/u/${suggestion.username ?? ""}`}
          aria-label={displayName}
          className="shrink-0"
        >
          <Avatar
            src={suggestion.avatar_url}
            fullName={displayName}
            size="md-bold"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/u/${suggestion.username ?? ""}`}
            className="block font-bold text-[13px] text-night truncate hover:text-gold-deep transition-colors"
          >
            {displayName}
          </Link>
          {suggestion.location ? (
            <p className="mt-0.5 text-[11px] text-night-dim truncate">
              {suggestion.location}
            </p>
          ) : null}
        </div>
        <Link
          href={`/u/${suggestion.username ?? ""}`}
          className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-night text-cream hover:bg-night-soft transition-colors"
          aria-label={`Voir le profil de ${displayName}`}
        >
          <UserPlus className="w-4 h-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
