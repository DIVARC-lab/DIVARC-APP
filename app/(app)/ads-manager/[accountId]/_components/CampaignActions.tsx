"use client";

import {
  Archive,
  Copy,
  MoreHorizontal,
  Pause,
  Play,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  activateCampaign,
  archiveCampaign,
  duplicateCampaign,
  pauseCampaign,
} from "../actions";

/* Boutons d'action pour une campagne (pause/play/duplicate/archive)
 * + menu dropdown. À utiliser depuis la page détail campagne ou la
 * liste sur le dashboard ad_account. */
export function CampaignActions({
  campaignId,
  adAccountId,
  status,
  size = "md",
}: {
  campaignId: string;
  adAccountId: string;
  status: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function handle(promise: Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await promise;
      setOpen(false);
      if (!result.ok) {
        toast.error(result.error ?? "Action échouée.");
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  const togglePauseLabel =
    status === "active" ? "Mettre en pause" : "Reprendre la diffusion";
  const ToggleIcon = status === "active" ? Pause : Play;
  const canActivate = status === "paused" || status === "draft";
  const canPause = status === "active";

  const btnClass =
    size === "sm"
      ? "px-3 py-1.5 text-[11.5px]"
      : "px-4 py-2 text-[12.5px]";

  return (
    <div ref={menuRef} className="relative inline-flex items-center gap-2">
      {canPause ? (
        <button
          type="button"
          onClick={() =>
            handle(
              pauseCampaign({ campaign_id: campaignId, ad_account_id: adAccountId }),
              "Campagne mise en pause.",
            )
          }
          disabled={pending}
          className={`inline-flex items-center gap-1.5 ${btnClass} rounded-full bg-white border border-line font-semibold text-night hover:bg-bg-soft disabled:opacity-50`}
        >
          <Pause className="w-3.5 h-3.5" aria-hidden />
          Pause
        </button>
      ) : null}
      {canActivate ? (
        <button
          type="button"
          onClick={() =>
            handle(
              activateCampaign({
                campaign_id: campaignId,
                ad_account_id: adAccountId,
              }),
              "Campagne activée.",
            )
          }
          disabled={pending}
          className={`inline-flex items-center gap-1.5 ${btnClass} rounded-full bg-emerald-50 border border-emerald-200 font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50`}
        >
          <Play className="w-3.5 h-3.5" aria-hidden />
          Activer
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Plus d'actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-line text-night-muted hover:bg-bg-soft`}
      >
        <MoreHorizontal className="w-4 h-4" aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-10 z-30 min-w-52 rounded-xl bg-white border border-line shadow-soft p-1.5"
        >
          <MenuItem
            icon={Copy}
            label="Dupliquer la campagne"
            onClick={() =>
              handle(
                duplicateCampaign({
                  campaign_id: campaignId,
                  ad_account_id: adAccountId,
                }).then((r) => {
                  if (r.ok) {
                    setTimeout(() => {
                      router.push(
                        `/ads-manager/${adAccountId}/campaigns/${r.new_campaign_id}`,
                      );
                    }, 500);
                  }
                  return r;
                }),
                "Campagne dupliquée (brouillon).",
              )
            }
          />
          <MenuItem
            icon={Archive}
            tone="danger"
            label="Archiver la campagne"
            onClick={() =>
              handle(
                archiveCampaign({
                  campaign_id: campaignId,
                  ad_account_id: adAccountId,
                }),
                "Campagne archivée.",
              )
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  tone = "neutral",
}: {
  icon: typeof Pause;
  label: string;
  onClick: () => void;
  tone?: "neutral" | "danger";
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] text-left transition-colors ${
        tone === "danger"
          ? "text-red-600 hover:bg-red-50"
          : "text-night-soft hover:bg-bg-soft"
      }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
      {label}
    </button>
  );
}
