"use client";

/* Étape 7/60 — Top Gifters Leaderboard (overlay gauche).
 *
 * Podium 🥇🥈🥉 + total coins par gifter. Refresh toutes les 10s via
 * RPC get_live_top_gifters. Glassmorphism navy + gold accent. */

import { Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";

type Gifter = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  total_coins: number;
  gifts_count: number;
  rank: number;
};

type Props = {
  sessionId: string;
  onViewAll?: () => void;
};

function formatCoins(cents: number): string {
  const euros = cents / 100;
  if (euros < 1000) return `${euros.toFixed(0)}`;
  if (euros < 10000) return `${(euros / 1000).toFixed(1)}k`.replace(".0", "");
  return `${Math.floor(euros / 1000)}k`;
}

const PODIUM_EMOJI: Record<number, string> = {
  1: "👑",
  2: "🥈",
  3: "🥉",
};

export function TopGiftersPanel({ sessionId, onViewAll }: Props) {
  const [gifters, setGifters] = useState<Gifter[]>([]);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      try {
        const supabase = createClient();
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const { data } = await (supabase as any).rpc(
          "get_live_top_gifters",
          { p_session_id: sessionId, p_limit: 3 },
        );
        if (alive) setGifters((data ?? []) as Gifter[]);
      } catch {
        /* silencieux */
      }
    }

    void refresh();
    const id = window.setInterval(refresh, 10_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [sessionId]);

  if (gifters.length === 0) return null;

  return (
    <div
      className="rounded-2xl bg-black/35 backdrop-blur-md border border-gold/20 px-3 py-2 min-w-[140px] pointer-events-auto"
      aria-label="Top fans"
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Crown
          className="w-3.5 h-3.5 text-gold"
          aria-hidden
          strokeWidth={2.6}
        />
        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-gold-soft">
          Top fans
        </p>
      </div>

      <ul className="space-y-1.5">
        {gifters.map((g) => {
          const name = g.full_name ?? g.username ?? "Spectateur";
          return (
            <li
              key={g.user_id}
              className="flex items-center gap-1.5 px-1 py-0.5 rounded-lg hover:bg-gold/10 transition-colors"
            >
              <span className="text-[14px]" aria-hidden>
                {PODIUM_EMOJI[g.rank] ?? `#${g.rank}`}
              </span>
              <Avatar src={g.avatar_url} fullName={name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white truncate leading-tight">
                  {name}
                </p>
                <p className="text-[9.5px] text-gold-soft tabular-nums leading-tight">
                  ◇ {formatCoins(g.total_coins)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {onViewAll ? (
        <button
          type="button"
          onClick={onViewAll}
          className="block mt-2 text-[9.5px] font-bold text-gold hover:text-gold-soft"
        >
          Voir tous →
        </button>
      ) : null}
    </div>
  );
}
