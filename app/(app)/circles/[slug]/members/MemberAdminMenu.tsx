"use client";

/* Sprint Members admin — Menu kebab (3 points) sur chaque membre, visible
 * uniquement pour owner/admin du cercle. Permet :
 *  - Avertir (warning)
 *  - Muter temporairement (24h ou 7j)
 *  - Exclure définitivement (permanent_ban)
 *
 * Le owner du cercle est intouchable (protégé côté server + bouton non
 * rendu côté UI). L'admin ne peut pas se sanctionner lui-même. */

import { Loader2, MoreVertical, ShieldOff, UserX, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { issueCircleSanction } from "../../actions";

type SanctionAction =
  | "warning"
  | "mute_24h"
  | "mute_7d"
  | "temp_ban_30d"
  | "permanent_ban";

const ACTIONS: {
  value: SanctionAction;
  label: string;
  description: string;
  tone: "warning" | "danger" | "info";
}[] = [
  {
    value: "warning",
    label: "Avertir",
    description: "Note un avertissement dans son historique.",
    tone: "info",
  },
  {
    value: "mute_24h",
    label: "Muter 24h",
    description: "Empêche de poster/commenter pendant 24h.",
    tone: "warning",
  },
  {
    value: "mute_7d",
    label: "Muter 7 jours",
    description: "Empêche de poster/commenter pendant une semaine.",
    tone: "warning",
  },
  {
    value: "temp_ban_30d",
    label: "Exclure 30 jours",
    description: "Suspension du cercle pendant 30 jours.",
    tone: "danger",
  },
  {
    value: "permanent_ban",
    label: "Exclure définitivement",
    description: "Bannissement permanent du cercle.",
    tone: "danger",
  },
];

type Props = {
  circleId: string;
  targetUserId: string;
  targetName: string;
};

export function MemberAdminMenu({
  circleId,
  targetUserId,
  targetName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<SanctionAction | null>(null);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function apply(action: SanctionAction) {
    if (reason.trim().length < 5) {
      toast.error("Précise la raison (5 caractères minimum).");
      return;
    }
    startTransition(async () => {
      const res = await issueCircleSanction(
        circleId,
        targetUserId,
        action,
        reason,
      );
      if (!res.ok) {
        toast.error(res.error ?? "Action impossible.");
        return;
      }
      toast.success(
        action === "permanent_ban" || action === "temp_ban_30d"
          ? "Membre exclu."
          : action.startsWith("mute_")
            ? "Membre muté."
            : "Avertissement enregistré.",
      );
      setOpen(false);
      setConfirming(null);
      setReason("");
      /* Recharge soft pour refléter l'état (le banned disparait de la
         liste membres actifs). */
      window.location.reload();
    });
  }

  return (
    <>
      {/* Bouton kebab — stoppe propagation pour ne pas trigger le Link parent. */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Actions sur ${targetName}`}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-night-dim hover:bg-bg-soft hover:text-night transition-colors shrink-0"
      >
        <MoreVertical className="w-4 h-4" aria-hidden />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-night/60 backdrop-blur-sm p-4"
          onClick={() => {
            setOpen(false);
            setConfirming(null);
            setReason("");
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <p className="text-[13px] font-bold text-night truncate">
                Actions sur {targetName}
              </p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setConfirming(null);
                  setReason("");
                }}
                aria-label="Fermer"
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-night-dim hover:bg-bg-soft"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {confirming ? (
              <ConfirmStep
                action={confirming}
                actionMeta={
                  ACTIONS.find((a) => a.value === confirming) ?? ACTIONS[0]
                }
                reason={reason}
                onReasonChange={setReason}
                onCancel={() => {
                  setConfirming(null);
                  setReason("");
                }}
                onConfirm={() => apply(confirming)}
                isPending={isPending}
                targetName={targetName}
              />
            ) : (
              <ul className="py-1 max-h-[60vh] overflow-y-auto">
                {ACTIONS.map((a) => (
                  <li key={a.value}>
                    <button
                      type="button"
                      onClick={() => setConfirming(a.value)}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-bg-soft transition-colors"
                    >
                      <div
                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          a.tone === "danger"
                            ? "bg-rose-100 text-rose-700"
                            : a.tone === "warning"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-night/5 text-night-dim"
                        }`}
                      >
                        {a.tone === "danger" ? (
                          <UserX className="w-4 h-4" aria-hidden />
                        ) : (
                          <ShieldOff className="w-4 h-4" aria-hidden />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-[13px] font-bold ${
                            a.tone === "danger" ? "text-rose-700" : "text-night"
                          }`}
                        >
                          {a.label}
                        </p>
                        <p className="text-[11px] text-night-dim leading-snug">
                          {a.description}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function ConfirmStep({
  action,
  actionMeta,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  isPending,
  targetName,
}: {
  action: SanctionAction;
  actionMeta: (typeof ACTIONS)[number];
  reason: string;
  onReasonChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
  targetName: string;
}) {
  const isBan = action === "permanent_ban" || action === "temp_ban_30d";
  return (
    <div className="p-4 space-y-3">
      <div
        className={`rounded-2xl p-3 ${
          isBan
            ? "bg-rose-50 border border-rose-200"
            : "bg-bg-soft border border-line"
        }`}
      >
        <p
          className={`text-[12.5px] font-bold mb-1 ${
            isBan ? "text-rose-700" : "text-night"
          }`}
        >
          {actionMeta.label} · {targetName}
        </p>
        <p className="text-[11.5px] text-night-dim leading-relaxed">
          {actionMeta.description}
          {isBan
            ? " L'utilisateur ne pourra plus accéder au cercle ni y publier."
            : ""}
        </p>
      </div>

      <div>
        <label
          htmlFor="reason"
          className="block text-[11px] font-bold uppercase tracking-wider text-night-dim mb-1"
        >
          Raison (5 caractères min, visible dans l&apos;audit log)
        </label>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Pourquoi cette action ?"
          className="w-full px-3 py-2 rounded-xl border border-line text-[13px] resize-none focus:outline-none focus:border-night/30"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="h-10 px-4 rounded-full text-[12px] font-bold text-night-dim hover:text-night"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending || reason.trim().length < 5}
          className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-[12px] font-bold text-white disabled:opacity-50 transition-colors ${
            isBan
              ? "bg-rose-600 hover:bg-rose-700"
              : "bg-night hover:bg-night/90"
          }`}
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : null}
          Confirmer
        </button>
      </div>
    </div>
  );
}
