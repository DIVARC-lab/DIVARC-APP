"use client";

/* Panneau modération : demandes de prise de parole (host/mod).
 *
 * Drawer right-side qui liste les demandes pending avec avatar + nom +
 * message optionnel + boutons Approuver / Refuser. Polling 3s. */

import { Check, Hand, Loader2, MessageSquareWarning, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import {
  approveStageRequest,
  denyStageRequest,
} from "../../stage-actions";

type Req = {
  id: string;
  requester_id: string;
  message: string | null;
  created_at: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type Props = {
  sessionId: string;
  open: boolean;
  onClose: () => void;
  /* Callback pour décrémenter le badge en haut du studio. */
  onPendingCountChange?: (n: number) => void;
};

export function StageRequestsPanel({
  sessionId,
  open,
  onClose,
  onPendingCountChange,
}: Props) {
  const [requests, setRequests] = useState<Req[]>([]);
  const [isPending, startTransition] = useTransition();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch(
        `/api/lives/${sessionId}/stage-requests`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { items: Req[] };
      setRequests(data.items);
      onPendingCountChange?.(data.items.length);
    } catch {
      /* silencieux */
    }
  }

  useEffect(() => {
    if (!open) return;
    void refresh();
    const id = window.setInterval(refresh, 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionId]);

  function handleApprove(requestId: string) {
    setResolvingId(requestId);
    startTransition(async () => {
      const res = await approveStageRequest({ requestId });
      setResolvingId(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Spectateur mis sur scène.");
      await refresh();
    });
  }

  function handleDeny(requestId: string) {
    setResolvingId(requestId);
    startTransition(async () => {
      const res = await denyStageRequest({ requestId });
      setResolvingId(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await refresh();
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-night/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm h-full bg-night/95 border-l border-cream/15 text-cream flex flex-col shadow-2xl"
        aria-label="Demandes de prise de parole"
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-cream/10">
          <div className="flex items-center gap-2">
            <Hand className="w-4 h-4 text-gold" aria-hidden />
            <p className="text-[12px] font-extrabold uppercase tracking-wider text-cream">
              Demandes
            </p>
            <span className="text-[10px] text-cream/50 tabular-nums">
              · {requests.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cream/10 hover:bg-cream/20"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <ul className="flex-1 overflow-y-auto p-3 space-y-2">
          {requests.length === 0 ? (
            <li className="text-[12px] text-cream/50 text-center py-12 px-4">
              <MessageSquareWarning
                className="w-8 h-8 mx-auto mb-2 text-cream/30"
                aria-hidden
              />
              Aucune demande en attente.
              <br />
              <span className="text-[10px] text-cream/40">
                Les spectateurs qui veulent intervenir apparaîtront ici.
              </span>
            </li>
          ) : (
            requests.map((r) => {
              const name = r.full_name ?? r.username ?? "Spectateur";
              const isLoading = resolvingId === r.id && isPending;
              return (
                <li
                  key={r.id}
                  className="rounded-2xl bg-cream/5 border border-cream/10 p-3"
                >
                  <div className="flex items-start gap-2.5">
                    <Avatar
                      src={r.avatar_url}
                      fullName={name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-bold text-cream truncate">
                        {name}
                      </p>
                      {r.message ? (
                        <p className="text-[11px] text-cream/70 leading-snug mt-0.5 line-clamp-3">
                          “{r.message}”
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeny(r.id)}
                      disabled={isPending}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-full bg-cream/10 text-cream/70 hover:bg-rose-500/20 hover:text-rose-300 text-[11px] font-bold transition-colors disabled:opacity-60"
                    >
                      {isLoading ? null : <X className="w-3 h-3" aria-hidden />}
                      Refuser
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(r.id)}
                      disabled={isPending}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 text-[11px] font-bold transition-colors disabled:opacity-60"
                    >
                      {isLoading ? (
                        <Loader2
                          className="w-3 h-3 animate-spin"
                          aria-hidden
                        />
                      ) : (
                        <Check className="w-3 h-3" aria-hidden />
                      )}
                      Approuver
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>

        <footer className="px-4 py-2.5 border-t border-cream/10 text-[10px] text-cream/40 text-center">
          Mise à jour automatique toutes les 3 secondes.
        </footer>
      </aside>
    </div>
  );
}
