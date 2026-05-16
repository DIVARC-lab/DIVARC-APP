"use client";

/* Compteur de likes prominent qui se met à jour en temps réel.
 *
 * Visible côté host ET viewer. Subscribe Realtime sur
 * circle_live_rooms.like_count + intervalle de fallback toutes les 5s
 * (au cas où Realtime down).
 *
 * Animation pulse-pop à chaque incrémentation. */

import { Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  sessionId: string;
  initialCount: number;
};

function formatCount(n: number): string {
  if (n < 1000) return n.toLocaleString("fr-FR");
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`.replace(".0", "");
  if (n < 1_000_000) return `${Math.floor(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`.replace(".0", "");
}

export function LiveLikesCounter({ sessionId, initialCount }: Props) {
  const [count, setCount] = useState(initialCount);
  const [pulse, setPulse] = useState(false);
  const lastCountRef = useRef(initialCount);

  /* Trigger pulse quand le compteur augmente. */
  useEffect(() => {
    if (count > lastCountRef.current) {
      setPulse(true);
      const id = window.setTimeout(() => setPulse(false), 400);
      return () => window.clearTimeout(id);
    }
    lastCountRef.current = count;
  }, [count]);

  /* Realtime + fallback polling 5s. */
  useEffect(() => {
    let alive = true;
    const supabase = createClient();

    /* Lit le count actuel au mount (au cas où il a évolué entre SSR
       et hydration). */
    async function fetchCount() {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data } = await (supabase as any)
        .from("circle_live_rooms")
        .select("like_count")
        .eq("id", sessionId)
        .maybeSingle();
      if (!alive) return;
      const c = data?.like_count;
      if (typeof c === "number") setCount(c);
    }
    void fetchCount();

    /* Realtime subscribe. */
    const channel = supabase
      .channel(`live-likes-counter-${sessionId}`)
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
          if (typeof r?.like_count === "number") {
            setCount(r.like_count);
          }
        },
      )
      .subscribe();

    /* Fallback polling 5s au cas où Realtime ne match pas. */
    const pollId = window.setInterval(() => {
      void fetchCount();
    }, 5000);

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
      window.clearInterval(pollId);
    };
  }, [sessionId]);

  return (
    <div
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-rose-500/20 backdrop-blur-md border border-rose-300/40 text-rose-200 transition-transform ${
        pulse ? "scale-110" : "scale-100"
      }`}
    >
      <Heart
        className={`w-3.5 h-3.5 fill-current ${
          pulse ? "animate-ping-once" : ""
        }`}
        aria-hidden
        strokeWidth={2.4}
      />
      <span className="text-[12px] font-extrabold tabular-nums">
        {formatCount(count)}
      </span>
    </div>
  );
}
