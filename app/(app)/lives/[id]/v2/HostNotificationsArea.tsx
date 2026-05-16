"use client";

/* Étape 29/60 — Area des notifications guest requests pour le host.
 *
 * Stack de GuestRequestCard qui glissent depuis le haut.
 * Polling 3s sur /api/lives/[id]/stage-requests. */

import { AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { GuestRequestCard } from "./GuestRequestCard";

type Req = {
  id: string;
  session_id: string;
  requester_id: string;
  username: string | null;
  avatar_url: string | null;
  message: string | null;
  user_follower_count: number;
  user_is_following_host: boolean;
  user_is_followed_by_host: boolean;
  created_at: string;
  expires_at: string | null;
};

type Props = {
  sessionId: string;
};

export function HostNotificationsArea({ sessionId }: Props) {
  const [requests, setRequests] = useState<Req[]>([]);

  useEffect(() => {
    let alive = true;
    async function refresh() {
      try {
        const res = await fetch(
          `/api/lives/${sessionId}/stage-requests`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { items: Req[] };
        if (!alive) return;
        /* Filtre expirées côté client en plus du backend. */
        const now = Date.now();
        const valid = (data.items ?? []).filter(
          (r) => !r.expires_at || new Date(r.expires_at).getTime() > now,
        );
        setRequests(valid.map((r) => ({ ...r, session_id: sessionId })));
      } catch {
        /* silencieux */
      }
    }
    void refresh();
    const id = window.setInterval(refresh, 3000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [sessionId]);

  function handleResolved(reqId: string) {
    setRequests((prev) => prev.filter((r) => r.id !== reqId));
  }

  return (
    <div
      className="absolute top-16 left-3 right-3 z-40 flex flex-col gap-2 pointer-events-none"
      aria-label="Demandes de prise de parole"
    >
      <AnimatePresence>
        {requests.slice(0, 2).map((r) => (
          <GuestRequestCard
            key={r.id}
            request={r}
            onResolved={handleResolved}
          />
        ))}
      </AnimatePresence>
      {requests.length > 2 ? (
        <p className="self-center text-[10px] font-bold text-cream/60 bg-black/40 backdrop-blur px-2.5 h-5 rounded-full inline-flex items-center pointer-events-auto">
          + {requests.length - 2} autres en attente
        </p>
      ) : null}
    </div>
  );
}
