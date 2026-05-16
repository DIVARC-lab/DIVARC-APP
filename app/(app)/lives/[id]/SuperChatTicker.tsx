"use client";

/* Étape 14 — Widget overlay super-chats actifs.
 *
 * Polling toutes les 5s sur /api/lives/[id]/super-chats. Affiche les
 * super-chats en cours d'épinglage avec leur couleur tier (1→7) +
 * avatar + message. Auto-disparaissent quand pinned_until_at expire.
 *
 * Positionné en absolute top-left de la video viewer (sous le poll widget
 * top-right). Mobile-first compact.
 */

import { Avatar } from "@/components/ui/Avatar";
import { useEffect, useRef, useState } from "react";

type SuperChat = {
  id: string;
  amount_cents: number;
  tier: number;
  message: string | null;
  pinned_until_at: string;
  paid_at: string;
  viewer_id: string;
  viewer_full_name: string | null;
  viewer_username: string | null;
  viewer_avatar_url: string | null;
};

const TIER_STYLES: Record<
  number,
  { bg: string; border: string; label: string; text: string }
> = {
  1: {
    bg: "bg-blue-500/90",
    border: "border-blue-300",
    label: "text-blue-50",
    text: "text-white",
  },
  2: {
    bg: "bg-teal-500/90",
    border: "border-teal-300",
    label: "text-teal-50",
    text: "text-white",
  },
  3: {
    bg: "bg-emerald-500/90",
    border: "border-emerald-300",
    label: "text-emerald-50",
    text: "text-white",
  },
  4: {
    bg: "bg-amber-400/95",
    border: "border-amber-200",
    label: "text-amber-900",
    text: "text-amber-950",
  },
  5: {
    bg: "bg-orange-500/95",
    border: "border-orange-300",
    label: "text-orange-50",
    text: "text-white",
  },
  6: {
    bg: "bg-rose-600/95",
    border: "border-rose-300",
    label: "text-rose-50",
    text: "text-white",
  },
  7: {
    bg: "bg-fuchsia-600/95",
    border: "border-fuchsia-300",
    label: "text-fuchsia-50",
    text: "text-white",
  },
};

type Props = {
  sessionId: string;
};

export function SuperChatTicker({ sessionId }: Props) {
  const [items, setItems] = useState<SuperChat[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      try {
        const res = await fetch(`/api/lives/${sessionId}/super-chats`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { items: SuperChat[] };
        if (!alive) return;
        /* Filtre côté client en plus : pinned_until_at > now() (au cas où
           le polling backend renvoie un item à la frontière). */
        const now = Date.now();
        setItems(
          (data.items ?? []).filter(
            (it) => new Date(it.pinned_until_at).getTime() > now,
          ),
        );
      } catch {
        /* silencieux : on retentera dans 5s */
      }
    }

    void refresh();
    timerRef.current = window.setInterval(() => {
      void refresh();
    }, 5000);

    return () => {
      alive = false;
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [sessionId]);

  if (items.length === 0) return null;

  return (
    <ul
      aria-label="Super-chats actifs"
      className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto pr-1"
    >
      {items.map((sc) => {
        const t = TIER_STYLES[sc.tier] ?? TIER_STYLES[1];
        const name =
          sc.viewer_full_name ?? sc.viewer_username ?? "Spectateur";
        return (
          <li
            key={sc.id}
            className={`flex items-start gap-2 rounded-2xl ${t.bg} backdrop-blur-md border ${t.border} shadow-lg px-2.5 py-2`}
          >
            <Avatar
              src={sc.viewer_avatar_url}
              fullName={name}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-[11px] font-bold truncate ${t.text}`}>
                  {name}
                </p>
                <span
                  className={`shrink-0 text-[10px] font-extrabold tabular-nums ${t.label} uppercase tracking-wider`}
                >
                  {(sc.amount_cents / 100).toFixed(2)} €
                </span>
              </div>
              {sc.message ? (
                <p
                  className={`text-[11.5px] mt-0.5 leading-snug break-words ${t.text}`}
                >
                  {sc.message}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
