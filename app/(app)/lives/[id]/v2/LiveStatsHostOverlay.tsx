"use client";

/* Étape 28/60 — Stats live overlay host.
 *
 * Compteur compact en haut à droite du studio :
 *   - Viewers peak / current
 *   - Total likes
 *   - Total gifts coins (= revenue_total_cents)
 *   - New followers gagnés pendant le live
 *
 * Refresh via Supabase Realtime sur circle_live_rooms. */

import { Coins, Eye, Heart, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Stats = {
  viewers_current: number;
  peak_participants: number;
  total_likes_count: number;
  total_gifts_coins: number;
  new_followers_count: number;
};

type Props = {
  sessionId: string;
  initial: Stats;
};

function formatCount(n: number): string {
  if (n < 1000) return n.toLocaleString("fr-FR");
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`.replace(".0", "");
  return `${Math.floor(n / 1000)}k`;
}

function formatEuro(cents: number): string {
  const euros = cents / 100;
  if (euros < 1000) return `${Math.round(euros)} €`;
  return `${(euros / 1000).toFixed(1)}k €`.replace(".0", "");
}

export function LiveStatsHostOverlay({ sessionId, initial }: Props) {
  const [stats, setStats] = useState<Stats>(initial);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live-stats-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "circle_live_rooms",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const r = payload.new as any;
          setStats({
            viewers_current: r.viewers_current ?? r.participants_count ?? 0,
            peak_participants: r.peak_participants ?? 0,
            total_likes_count: r.total_likes_count ?? r.like_count ?? 0,
            total_gifts_coins:
              r.total_gifts_coins ?? r.revenue_total_cents ?? 0,
            new_followers_count: r.new_followers_count ?? 0,
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return (
    <div className="grid grid-cols-2 gap-1 bg-black/55 backdrop-blur-md rounded-2xl border border-cream/15 p-2 min-w-[180px]">
      <Stat icon={<Eye className="w-3 h-3" aria-hidden />} label="En direct">
        {formatCount(stats.viewers_current)}
      </Stat>
      <Stat icon={<Users className="w-3 h-3" aria-hidden />} label="Peak">
        {formatCount(stats.peak_participants)}
      </Stat>
      <Stat
        icon={<Heart className="w-3 h-3" aria-hidden />}
        label="Likes"
      >
        {formatCount(stats.total_likes_count)}
      </Stat>
      <Stat
        icon={<Coins className="w-3 h-3 text-gold" aria-hidden />}
        label="Coins"
        valueClass="text-gold"
      >
        {formatEuro(stats.total_gifts_coins)}
      </Stat>
    </div>
  );
}

function Stat({
  icon,
  label,
  children,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0 px-1.5 py-1 rounded-xl">
      <span className="inline-flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-wider text-cream/50">
        {icon}
        {label}
      </span>
      <span
        className={`text-[12.5px] font-extrabold tabular-nums ${
          valueClass ?? "text-cream"
        } leading-tight`}
      >
        {children}
      </span>
    </div>
  );
}
