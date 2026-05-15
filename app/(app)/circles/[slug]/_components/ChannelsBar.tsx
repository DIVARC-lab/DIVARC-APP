"use client";

import { Hash, Megaphone, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CircleChannelSummary } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";

type Props = {
  circleSlug: string;
  channels: CircleChannelSummary[];
  /* Slug du channel actif, ou null si "Tous". */
  activeSlug: string | null;
};

/* Chantier v4 Sprint B.2 — navigation channels horizontale (mobile +
 * desktop). Discord-style mais orientation horizontale pour réutiliser
 * le pattern de pills déjà établi (FlairSelector, CircleFeedSortFilters).
 * V2 = sidebar verticale sur très grand écran.
 * Préserve les autres searchParams (sort) lors du switch. */
export function ChannelsBar({ circleSlug, channels, activeSlug }: Props) {
  const params = useSearchParams();
  if (channels.length === 0) return null;

  const base = `/circles/${circleSlug}`;
  const allActive = activeSlug === null;

  function hrefFor(channelSlug: string | null): string {
    /* Next.js 16 : `useSearchParams()` retourne ReadonlyURLSearchParams.
       On passe par .toString() pour construire un URLSearchParams mutable
       sans dépendre de la signature exacte du constructeur. */
    const sp = new URLSearchParams(params?.toString() ?? "");
    if (channelSlug) sp.set("channel", channelSlug);
    else sp.delete("channel");
    const qs = sp.toString();
    return qs ? `${base}?${qs}` : base;
  }

  return (
    <nav
      aria-label="Channels du cercle"
      className="mb-3 -mx-5 sm:-mx-8 px-5 sm:px-8 overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]"
    >
      <ul className="flex items-center gap-1.5 min-w-max">
        <li>
          <Link
            href={hrefFor(null)}
            scroll={false}
            aria-current={allActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors",
              allActive
                ? "bg-night text-bg"
                : "bg-white border border-line text-night-dim hover:text-night hover:border-night/30",
            )}
          >
            Tous
          </Link>
        </li>
        {channels.map((channel) => {
          const active = activeSlug === channel.slug;
          const Icon = iconForChannelType(channel.channel_type);
          return (
            <li key={channel.id}>
              <Link
                href={hrefFor(channel.slug)}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors",
                  active
                    ? "bg-night text-bg"
                    : "bg-white border border-line text-night-dim hover:text-night hover:border-night/30",
                )}
                title={channel.description ?? undefined}
              >
                <Icon
                  className={cn(
                    "w-3.5 h-3.5",
                    active ? "text-gold" : "text-night-dim/70",
                  )}
                  aria-hidden
                />
                {channel.name}
                {channel.posts_count > 0 ? (
                  <span
                    className={cn(
                      "ml-0.5 text-[10px] font-bold tabular-nums",
                      active ? "text-bg/70" : "text-night-dim/60",
                    )}
                  >
                    {channel.posts_count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function iconForChannelType(type: CircleChannelSummary["channel_type"]) {
  switch (type) {
    case "announcement":
      return Megaphone;
    case "forum":
      return MessagesSquare;
    case "text":
    default:
      return Hash;
  }
}
