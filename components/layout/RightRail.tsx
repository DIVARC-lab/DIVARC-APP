"use client";

import { Cake, MoreHorizontal, Search, Users, Video } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { cn } from "@/lib/utils/cn";

/* RightRail — sidebar droite style Facebook, visible UNIQUEMENT desktop
 * xl ≥ 1280px. Largeur 320px, fixed top-14 right-0.
 *
 * Sections :
 *  - Anniversaires (si data dispo)
 *  - Contacts en ligne (avatars + indicateur online vert)
 *  - Suggestions (personnes à connaître)
 *  - Beta privée DIVARC (signature, navy + gold)
 *
 * Utilisé sur les pages /feed, /explore, /profile et autres pages
 * "social-heavy". Chaque page importe et plug RightRail avec ses props
 * spécifiques. */

type Contact = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  online?: boolean;
};

type Suggestion = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  reason?: string;
};

type Birthday = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type RightRailProps = {
  contacts?: Contact[];
  suggestions?: Suggestion[];
  birthdays?: Birthday[];
  /** Hide la card "Beta privée" (déjà vue, etc.). */
  hideBetaCard?: boolean;
};

export function RightRail({
  contacts = [],
  suggestions = [],
  birthdays = [],
  hideBetaCard = false,
}: RightRailProps) {
  return (
    <aside
      aria-label="Suggestions et contacts"
      className="hidden xl:flex xl:flex-col fixed right-0 top-14 bottom-0 w-80 px-3 py-4 gap-4 overflow-y-auto z-30"
    >
      {birthdays.length > 0 ? <BirthdaySection birthdays={birthdays} /> : null}

      {!hideBetaCard ? <BetaCard /> : null}

      {contacts.length > 0 ? <ContactsSection contacts={contacts} /> : null}

      {suggestions.length > 0 ? (
        <SuggestionsSection suggestions={suggestions} />
      ) : null}
    </aside>
  );
}

function BirthdaySection({ birthdays }: { birthdays: Birthday[] }) {
  const first = birthdays[0];
  const others = birthdays.length - 1;
  if (!first) return null;
  const name = first.full_name ?? first.username ?? "Quelqu'un";
  return (
    <section className="rounded-2xl bg-bg-soft p-3 flex items-start gap-3">
      <Cake className="w-5 h-5 text-gold-deep shrink-0 mt-0.5" aria-hidden />
      <p className="text-[13px] text-night leading-relaxed">
        <strong className="font-semibold">C&apos;est l&apos;anniversaire de {name}</strong>
        {others > 0 ? ` et ${others} autre${others > 1 ? "s" : ""}` : ""}{" "}
        aujourd&apos;hui.
      </p>
    </section>
  );
}

function ContactsSection({ contacts }: { contacts: Contact[] }) {
  return (
    <section>
      <header className="flex items-center justify-between px-2 py-2">
        <h3 className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-muted flex items-center gap-1.5">
          <span className="text-gold-deep">·</span>
          Contacts
        </h3>
        <div className="flex items-center gap-0.5">
          <RailIconButton icon={Video} label="Démarrer un appel" />
          <RailIconButton icon={Search} label="Rechercher contact" />
          <RailIconButton icon={MoreHorizontal} label="Options" />
        </div>
      </header>
      <ul className="flex flex-col">
        {contacts.slice(0, 12).map((contact) => (
          <li key={contact.id}>
            <Link
              href={
                contact.username
                  ? `/u/${contact.username}`
                  : "/messages"
              }
              className="flex items-center gap-3 px-2 h-11 rounded-lg hover:bg-bg-soft transition-colors"
            >
              <span className="relative shrink-0">
                <Avatar
                  src={contact.avatar_url}
                  fullName={contact.full_name ?? contact.username}
                  size="sm"
                />
                {contact.online ? (
                  <span
                    aria-label="En ligne"
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-online ring-2 ring-bg"
                  />
                ) : null}
              </span>
              <span className="text-[14px] text-night truncate font-medium">
                {contact.full_name ?? contact.username ?? "Membre"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SuggestionsSection({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  return (
    <section>
      <header className="flex items-center justify-between px-2 py-2">
        <h3 className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-muted flex items-center gap-1.5">
          <span className="text-gold-deep">·</span>
          Suggestions
        </h3>
      </header>
      <ul className="flex flex-col gap-1.5 px-2">
        {suggestions.slice(0, 5).map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-3 p-2 rounded-xl bg-surface border border-line"
          >
            <Avatar
              src={s.avatar_url}
              fullName={s.full_name ?? s.username}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-night truncate">
                {s.full_name ?? s.username ?? "Membre"}
              </p>
              {s.reason ? (
                <p className="text-[11px] text-muted truncate">{s.reason}</p>
              ) : null}
            </div>
            <Link
              href={s.username ? `/u/${s.username}` : "/explore"}
              className="shrink-0 inline-flex items-center px-3 h-8 rounded-full bg-gold text-night text-[11px] font-bold hover:bg-gold-soft transition-colors"
            >
              Suivre
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* Card "Beta privée" — signature DIVARC, navy gradient + ArcDeco gold +
 * eyebrow gold + Cormorant italic + CTA gold. C'est un asset unique
 * DIVARC à préserver tel quel à travers toute l'app. */
function BetaCard() {
  return (
    <article className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-night to-night-soft text-cream p-5">
      <div
        aria-hidden
        className="absolute -right-12 -top-14 opacity-50 pointer-events-none"
      >
        <ArcDeco size={180} tone="gold" opacity={0.6} stroke={1.25} />
      </div>
      <div className="relative">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold flex items-center gap-1">
          <span>·</span>BETA PRIVÉE
        </p>
        <h3 className="mt-1.5 font-display italic text-[20px] leading-tight">
          Tu fais partie des fondateurs.
        </h3>
        <p className="mt-2 text-[13px] text-cream/80 leading-relaxed">
          Ton parcours façonne ce que DIVARC devient. Suis tes apports.
        </p>
        <Link
          href="/profile"
          className="mt-3 inline-flex items-center px-3 h-9 rounded-full bg-gold text-night text-[13px] font-bold hover:bg-gold-soft transition-colors"
        >
          Mon parcours →
        </Link>
      </div>
    </article>
  );
}

function RailIconButton({
  icon: Icon,
  label,
}: {
  icon: typeof Video;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "w-8 h-8 rounded-full hover:bg-bg-soft text-night-dim hover:text-night flex items-center justify-center transition-colors",
      )}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
    </button>
  );
}
