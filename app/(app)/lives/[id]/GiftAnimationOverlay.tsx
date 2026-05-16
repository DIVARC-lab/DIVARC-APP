"use client";

/* Étape 16 — Animation overlay cadeaux entrants.
 *
 * Polling 3s sur /api/lives/[id]/gifts → diff avec la dernière vue,
 * pour chaque nouveau cadeau on injecte un élément flottant qui monte
 * en CSS pendant 4s avant disparition.
 *
 * Pas de Lottie pour V1 — animations CSS pures (transform + opacity).
 * Léger, compatible mobile. */

import { useEffect, useRef, useState } from "react";
import { iconForGift } from "./GiftCatalog";

type Gift = {
  id: string;
  gift_id: string;
  gift_label: string;
  gift_icon_name: string;
  gift_color: string;
  amount_cents: number;
  paid_at: string;
  viewer_id: string;
  viewer_full_name: string | null;
  viewer_username: string | null;
};

type FloatingGift = Gift & {
  /* Côté Y de départ — random 0..100 px pour éviter empilage. */
  offsetX: number;
};

const ANIMATION_MS = 4500;

type Props = {
  sessionId: string;
};

export function GiftAnimationOverlay({ sessionId }: Props) {
  const [floating, setFloating] = useState<FloatingGift[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    let alive = true;
    let timer: number | null = null;

    async function poll() {
      try {
        const res = await fetch(
          `/api/lives/${sessionId}/gifts?since=15`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { items: Gift[] };
        if (!alive) return;

        /* Ignore les cadeaux antérieurs au mount (sinon flood au refresh). */
        const newOnes: FloatingGift[] = [];
        for (const g of data.items ?? []) {
          if (seenRef.current.has(g.id)) continue;
          const paidAtMs = new Date(g.paid_at).getTime();
          if (paidAtMs < mountTimeRef.current - 5000) {
            seenRef.current.add(g.id);
            continue;
          }
          seenRef.current.add(g.id);
          newOnes.push({
            ...g,
            offsetX: Math.floor(Math.random() * 120) - 60,
          });
        }

        if (newOnes.length === 0) return;

        setFloating((prev) => [...prev, ...newOnes]);

        for (const g of newOnes) {
          window.setTimeout(() => {
            setFloating((prev) => prev.filter((f) => f.id !== g.id));
          }, ANIMATION_MS);
        }
      } catch {
        /* silencieux */
      }
    }

    void poll();
    timer = window.setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      alive = false;
      if (timer !== null) window.clearInterval(timer);
    };
  }, [sessionId]);

  if (floating.length === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {floating.map((g) => {
        const Icon = iconForGift(g.gift_icon_name);
        const name =
          g.viewer_full_name ?? g.viewer_username ?? "Spectateur";
        return (
          /* Wrapper applique offsetX horizontal, l'enfant anime translateY. */
          <div
            key={g.id}
            className="absolute bottom-20 left-1/2"
            style={{ transform: `translateX(${g.offsetX}px)` }}
          >
            <div className="flex flex-col items-center gap-1 animate-gift-rise">
              <span
                className="inline-flex items-center justify-center w-12 h-12 rounded-full shadow-lg"
                style={{ backgroundColor: g.gift_color }}
              >
                <Icon
                  className="w-6 h-6 text-white drop-shadow"
                  aria-hidden
                  strokeWidth={2.4}
                />
              </span>
              <span className="text-[10px] font-bold text-white bg-night/60 backdrop-blur px-2 py-0.5 rounded-full shadow">
                {name}
                <span className="ml-1 text-gold tabular-nums">
                  {(g.amount_cents / 100).toFixed(2)} €
                </span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
