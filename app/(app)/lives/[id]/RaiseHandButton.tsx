"use client";

/* Bouton "Lever la main" — variante rail vertical TikTok-style.
 *
 * États :
 *   idle      → icône Hand neutre
 *   pending   → icône Hand ambre + dot animée
 *   approved  → icône Hand emerald (on scène) */

import { Hand, Loader2 } from "lucide-react";
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

  function handleClick() {
    if (isPending) return;
    if (status === "pending") {
      startTransition(async () => {
        const res = await cancelMyStageRequest({ sessionId });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setStatus("idle");
      });
      return;
    }
    if (status === "approved") return;
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

  const variantClass =
    status === "approved"
      ? "bg-emerald-500 text-white border-emerald-300/30"
      : status === "pending"
        ? "bg-amber-400 text-amber-950 border-amber-300/40"
        : "bg-night/70 backdrop-blur-md border-cream/15 text-cream group-hover:bg-cream/15";

  const labelText =
    status === "approved"
      ? "Sur scène"
      : status === "pending"
        ? "En attente"
        : "Demander";

  const labelColor =
    status === "approved"
      ? "text-emerald-300"
      : status === "pending"
        ? "text-amber-300"
        : "text-cream/80";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={labelText}
      className="group flex flex-col items-center gap-0.5"
    >
      <span
        className={`relative inline-flex items-center justify-center w-11 h-11 rounded-full border transition-colors shadow-lg active:scale-90 ${variantClass}`}
      >
        {isPending ? (
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
        ) : (
          <Hand className="w-5 h-5" aria-hidden />
        )}
        {status === "pending" ? (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-night animate-pulse"
          />
        ) : null}
      </span>
      <span
        className={`text-[9px] font-extrabold drop-shadow ${labelColor}`}
      >
        {labelText}
      </span>
    </button>
  );
}
