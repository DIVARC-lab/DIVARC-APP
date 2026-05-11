"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { safeFormatDate } from "@/lib/utils/date";

type Props = {
  scheduledDeletionAt: string | null;
  deletionRequestedAt: string | null;
};

export function DeleteAccountSection({
  scheduledDeletionAt,
  deletionRequestedAt,
}: Props) {
  const [scheduledAt, setScheduledAt] = useState<string | null>(
    scheduledDeletionAt,
  );
  const [pending, startTransition] = useTransition();
  const [confirmInput, setConfirmInput] = useState("");

  function handleRequest() {
    if (confirmInput !== "SUPPRIMER") {
      toast.error("Tape 'SUPPRIMER' pour confirmer.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/me/delete", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setScheduledAt(data.scheduled_deletion_at);
        setConfirmInput("");
        toast.success(
          "Compte programmé pour suppression dans 30 jours. Tu peux annuler.",
        );
      } else {
        toast.error(data.error ?? "Erreur");
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const res = await fetch("/api/me/delete", { method: "DELETE" });
      if (res.ok) {
        setScheduledAt(null);
        toast.success("Suppression annulée.");
      } else {
        toast.error("Erreur");
      }
    });
  }

  if (scheduledAt) {
    return (
      <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200">
        <p className="text-[12.5px] text-red-900">
          ⚠️ Suppression programmée le{" "}
          <strong>
            {safeFormatDate(scheduledAt, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </strong>
        </p>
        {deletionRequestedAt ? (
          <p className="mt-1 text-[11px] text-red-800">
            Demandée le{" "}
            {safeFormatDate(deletionRequestedAt, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleCancel}
          disabled={pending}
          className="mt-3 inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-white border border-red-300 text-red-700 text-[12px] font-semibold hover:bg-red-100"
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : null}
          Annuler la suppression
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[12px] font-semibold text-red-700">
        Tape <code>SUPPRIMER</code> pour confirmer :
      </p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={confirmInput}
          onChange={(e) => setConfirmInput(e.target.value)}
          placeholder="SUPPRIMER"
          className="flex-1 h-9 px-3 rounded-lg border border-red-200 bg-white text-[12.5px] text-night focus:border-red-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleRequest}
          disabled={pending || confirmInput !== "SUPPRIMER"}
          className={cn(
            "h-9 px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors",
            confirmInput === "SUPPRIMER" && !pending
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-red-100 text-red-400 cursor-not-allowed",
          )}
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="w-3.5 h-3.5" aria-hidden />
          )}
          Programmer
        </button>
      </div>
    </div>
  );
}
