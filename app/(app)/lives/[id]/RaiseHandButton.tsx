"use client";

/* Bouton "Demander la parole" côté viewer.
 *
 * États :
 *   idle      → bouton "Lever la main" (clic ouvre prompt)
 *   pending   → "Demande en attente…" (clic = annuler)
 *   approved  → "Tu es sur scène" + bouton "Couper le micro" (V2)
 *   denied/revoked/cancelled → refresh à idle
 *
 * Polling 4s pour catch le changement de status. */

import { Hand, Loader2, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  cancelMyStageRequest,
  requestJoinStage,
} from "../stage-actions";

type Status = "idle" | "pending" | "approved" | "denied" | "cancelled" | "revoked";

type Props = {
  sessionId: string;
};

export function RaiseHandButton({ sessionId }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;

    async function refresh() {
      try {
        const supabase = createClient();
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const { data } = await (supabase as any).rpc(
          "get_my_stage_request_status",
          { p_session_id: sessionId },
        );
        if (!alive) return;
        const s = (data as Status | null) ?? "idle";
        /* On considère denied/cancelled/revoked comme idle pour permettre
           une nouvelle demande après cooldown UX (V1 simple). */
        if (s === "denied" || s === "cancelled" || s === "revoked") {
          setStatus("idle");
        } else {
          setStatus(s);
        }
      } catch {
        /* silencieux */
      }
    }

    void refresh();
    const id = window.setInterval(refresh, 4000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [sessionId]);

  function handleRequest() {
    startTransition(async () => {
      const res = await requestJoinStage({ sessionId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setStatus("pending");
      toast.success("Demande envoyée au host !");
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelMyStageRequest({ sessionId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setStatus("idle");
    });
  }

  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-emerald-500 text-white text-[11px] font-bold">
        <Hand className="w-3.5 h-3.5" aria-hidden />
        Sur scène
      </span>
    );
  }

  if (status === "pending") {
    return (
      <button
        type="button"
        onClick={handleCancel}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-amber-400 text-amber-950 hover:bg-amber-300 text-[11px] font-bold transition-colors disabled:opacity-60"
        title="Annuler ma demande"
      >
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
        ) : (
          <X className="w-3.5 h-3.5" aria-hidden />
        )}
        En attente…
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleRequest}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-cream/10 text-cream hover:bg-cream/20 text-[11px] font-bold transition-colors disabled:opacity-60"
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
      ) : (
        <Hand className="w-3.5 h-3.5" aria-hidden />
      )}
      Lever la main
    </button>
  );
}
