"use client";

/* Étape 51/60 — Modal top gifters complète (top 50).
 *
 * Liste full des gifters du live avec rank, avatar, coins, badge
 * "Super Fan" pour le #1. */

import { Crown, Loader2, X } from "lucide-react";
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
  open: boolean;
  onClose: () => void;
};

function formatCoins(cents: number): string {
  const euros = cents / 100;
  if (euros < 1000) return `${euros.toFixed(2)} €`;
  return `${(euros / 1000).toFixed(1)}k €`.replace(".0", "");
}

const RANK_BG: Record<number, string> = {
  1: "bg-gradient-to-br from-amber-300/80 to-gold/80 text-night",
  2: "bg-gradient-to-br from-zinc-300/80 to-zinc-400/80 text-night",
  3: "bg-gradient-to-br from-amber-700/80 to-amber-800/80 text-cream",
};

export function TopGiftersModal({ sessionId, open, onClose }: Props) {
  const [gifters, setGifters] = useState<Gifter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data } = await (supabase as any).rpc(
        "get_live_top_gifters",
        { p_session_id: sessionId, p_limit: 50 },
      );
      if (alive) {
        setGifters((data ?? []) as Gifter[]);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [sessionId, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-night/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-night text-cream border-t-2 sm:border-2 border-gold/30 shadow-2xl"
      >
        <header className="flex items-center justify-between p-5 border-b border-cream/10">
          <div className="flex items-center gap-2">
            <Crown
              className="w-4 h-4 text-gold"
              aria-hidden
              strokeWidth={2.6}
            />
            <h2 className="font-display italic text-[18px] text-cream">
              Top <em className="text-gold">gifters</em>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-cream/10 hover:bg-cream/20 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2
                className="w-6 h-6 animate-spin text-gold"
                aria-hidden
              />
            </div>
          ) : gifters.length === 0 ? (
            <p className="text-[12.5px] text-cream/50 text-center py-10">
              Pas encore de cadeaux envoyés.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {gifters.map((g) => {
                const name = g.full_name ?? g.username ?? "Spectateur";
                const isTop1 = g.rank === 1;
                return (
                  <li
                    key={g.user_id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-2xl ${
                      g.rank <= 3 ? "bg-cream/5" : ""
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-[13px] font-extrabold ${
                        RANK_BG[g.rank] ?? "bg-cream/10 text-cream"
                      }`}
                    >
                      {g.rank}
                    </span>
                    <Avatar
                      src={g.avatar_url}
                      fullName={name}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-bold text-cream truncate">
                          {name}
                        </p>
                        {isTop1 ? (
                          <span className="inline-flex items-center h-4 px-1.5 rounded-sm bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white text-[8.5px] font-extrabold uppercase tracking-wider">
                            Super Fan
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[10.5px] text-cream/60">
                        {g.gifts_count} cadeau
                        {g.gifts_count > 1 ? "x" : ""} envoyés
                      </p>
                    </div>
                    <span className="text-[13px] font-extrabold text-gold tabular-nums">
                      {formatCoins(g.total_coins)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="text-[10px] text-cream/40 text-center p-3 border-t border-cream/10">
          Classement actualisé en temps réel.
        </p>
      </div>
    </div>
  );
}
