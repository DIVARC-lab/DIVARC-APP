"use client";

import { Check, Copy, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { CircleInvitation } from "@/lib/database.types";
import {
  createCircleInvitation,
  revokeCircleInvitation,
} from "../../actions";

type CircleInvitationsManagerProps = {
  circleId: string;
  invitations: CircleInvitation[];
};

export function CircleInvitationsManager({
  circleId,
  invitations,
}: CircleInvitationsManagerProps) {
  const [maxUses, setMaxUses] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [pending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    formData.set("circle_id", circleId);
    formData.set("max_uses", maxUses);
    formData.set("expires_in_days", expiresInDays);

    startTransition(async () => {
      const result = await createCircleInvitation(formData);
      if (!result.ok) {
        toast.error(result.error ?? "Création impossible.");
        return;
      }
      toast.success("Lien créé. Copie-le pour le partager.");
      setMaxUses("");
      setExpiresInDays("");
    });
  };

  const inviteUrl = (token: string) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${token}`
      : `/invite/${token}`;

  const handleCopy = async (id: string, token: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      setCopiedId(id);
      toast.success("Lien copié.");
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      toast.error("Impossible de copier.");
    }
  };

  const handleRevoke = (id: string) => {
    startTransition(async () => {
      const result = await revokeCircleInvitation(id);
      if (!result.ok) toast.error(result.error ?? "Action impossible.");
      else toast.success("Invitation révoquée.");
    });
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleCreate}
        className="rounded-2xl bg-white border border-line p-5 space-y-4"
      >
        <p className="text-sm font-semibold text-night">Nouveau lien</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-night-muted mb-1">
              Limite d&apos;usages (facultatif)
            </label>
            <input
              type="number"
              value={maxUses}
              onChange={(event) => setMaxUses(event.currentTarget.value)}
              min={1}
              max={1000}
              placeholder="Illimité"
              className="w-full h-11 rounded-xl border border-line bg-white px-3 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-night-muted mb-1">
              Expiration (jours, facultatif)
            </label>
            <input
              type="number"
              value={expiresInDays}
              onChange={(event) =>
                setExpiresInDays(event.currentTarget.value)
              }
              min={1}
              max={365}
              placeholder="Aucune"
              className="w-full h-11 rounded-xl border border-line bg-white px-3 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={pending}>
            <Plus className="w-4 h-4" aria-hidden />
            Générer un lien
          </Button>
        </div>
      </form>

      {invitations.length === 0 ? (
        <p className="text-sm text-muted text-center py-8 rounded-2xl border border-dashed border-line">
          Pas encore d&apos;invitation.{" "}
          <span className="italic font-display text-night">
            Crée le premier lien.
          </span>
        </p>
      ) : (
        <ul className="space-y-3">
          {invitations.map((invitation) => {
            const isRevoked = !!invitation.revoked_at;
            const isExhausted =
              !!invitation.max_uses && invitation.uses >= invitation.max_uses;
            /* React 19 strict : Date.now() bloqué en render,
               new Date().getTime() est autorisé. */
            const isExpired =
              !!invitation.expires_at &&
              new Date(invitation.expires_at).getTime() <=
                new Date().getTime();
            const isActive = !isRevoked && !isExhausted && !isExpired;

            return (
              <li
                key={invitation.id}
                className={cn(
                  "rounded-2xl border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4",
                  isActive
                    ? "bg-white border-line"
                    : "bg-night/[0.03] border-line opacity-70",
                )}
              >
                <div className="flex-1 min-w-0">
                  <code
                    className="block text-xs font-mono text-night truncate"
                    title={invitation.token}
                  >
                    /invite/{invitation.token}
                  </code>
                  <p className="text-[11px] text-muted mt-1">
                    {invitation.uses}{" "}
                    {invitation.uses === 1 ? "utilisation" : "utilisations"}
                    {invitation.max_uses
                      ? ` / ${invitation.max_uses} max`
                      : " · sans limite"}
                    {invitation.expires_at
                      ? ` · expire le ${new Date(invitation.expires_at).toLocaleDateString("fr-FR")}`
                      : ""}
                    {isRevoked
                      ? " · révoquée"
                      : isExhausted
                        ? " · épuisée"
                        : isExpired
                          ? " · expirée"
                          : ""}
                  </p>
                </div>
                {isActive ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(invitation.id, invitation.token)
                      }
                      className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-gold text-night text-xs font-semibold hover:bg-gold-soft transition-colors"
                    >
                      {copiedId === invitation.id ? (
                        <Check className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <Copy className="w-3.5 h-3.5" aria-hidden />
                      )}
                      {copiedId === invitation.id ? "Copié" : "Copier le lien"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevoke(invitation.id)}
                      disabled={pending}
                      aria-label="Révoquer"
                      className="w-9 h-9 rounded-full bg-white border border-line text-night-muted hover:border-red-500 hover:text-red-500 flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden />
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
