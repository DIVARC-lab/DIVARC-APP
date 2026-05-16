"use client";

/* Context partagé pour les likes du live :
 *   - count global synchronisé via Realtime UPDATE circle_live_rooms
 *   - hearts flottants (positions absolutes en %) partagés entre tous
 *     les composants (bouton + tap zone)
 *   - triggerLike(x?, y?) appelle RPC + broadcast + anim locale
 *
 * Utilisé par LiveLikeButton (anim depuis le bouton) ET
 * LiveTapToLikeOverlay (anim depuis le tap sur la vidéo). */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

export type HeartParticle = {
  id: number;
  /* Position de spawn en % de la fenêtre (ou pixels via origin). */
  originX: number; // px depuis le bord gauche
  originY: number; // px depuis le haut
  /* Dérive horizontale aléatoire pour l'animation. */
  driftX: number;
  color: string;
};

type Ctx = {
  count: number;
  hearts: HeartParticle[];
  triggerLike: (originX?: number, originY?: number) => void;
};

const LiveLikesCtx = createContext<Ctx | null>(null);

const HEART_COLORS = [
  "#f43f5e",
  "#ec4899",
  "#fb7185",
  "#f97316",
  "#a855f7",
  "#facc15",
];

export function LiveLikesProvider({
  sessionId,
  initialCount,
  children,
}: {
  sessionId: string;
  initialCount: number;
  children: React.ReactNode;
}) {
  const [count, setCount] = useState(initialCount);
  const [hearts, setHearts] = useState<HeartParticle[]>([]);
  const nextIdRef = useRef(0);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  const spawnHeart = useCallback((originX: number, originY: number) => {
    const id = ++nextIdRef.current;
    const heart: HeartParticle = {
      id,
      originX,
      originY,
      driftX: Math.floor(Math.random() * 80) - 40,
      color:
        HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)] ??
        "#f43f5e",
    };
    setHearts((prev) => [...prev, heart]);
    window.setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, 2200);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live-reactions-${sessionId}`)
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
          const newRow = payload.new as any;
          if (typeof newRow?.like_count === "number") {
            setCount(newRow.like_count);
          }
        },
      )
      .on("broadcast", { event: "heart" }, (payload) => {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const p = payload.payload as any;
        if (typeof p?.x === "number" && typeof p?.y === "number") {
          spawnHeart(p.x, p.y);
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [sessionId, spawnHeart]);

  const triggerLike = useCallback(
    (originX?: number, originY?: number) => {
      const x =
        typeof originX === "number"
          ? originX
          : typeof window !== "undefined"
            ? window.innerWidth - 60
            : 0;
      const y =
        typeof originY === "number"
          ? originY
          : typeof window !== "undefined"
            ? window.innerHeight - 120
            : 0;

      /* Anim locale immédiate. */
      spawnHeart(x, y);

      /* Broadcast aux autres viewers. */
      channelRef.current?.send({
        type: "broadcast",
        event: "heart",
        payload: { x, y },
      });

      /* RPC fire-and-forget. */
      void (async () => {
        try {
          const supabase = createClient();
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const { data, error } = await (supabase as any).rpc(
            "send_live_like",
            { p_session_id: sessionId },
          );
          if (!error && typeof data === "number") {
            setCount(data);
          }
        } catch {
          /* silencieux */
        }
      })();
    },
    [sessionId, spawnHeart],
  );

  const value = useMemo(
    () => ({ count, hearts, triggerLike }),
    [count, hearts, triggerLike],
  );

  return (
    <LiveLikesCtx.Provider value={value}>{children}</LiveLikesCtx.Provider>
  );
}

export function useLiveLikes(): Ctx {
  const ctx = useContext(LiveLikesCtx);
  if (!ctx) {
    throw new Error("useLiveLikes doit être appelé dans LiveLikesProvider");
  }
  return ctx;
}
