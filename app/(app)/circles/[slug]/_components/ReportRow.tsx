"use client";

/* Sprint J — Ligne single d'un signalement dans la queue admin.
 *
 * État local : open → action picker → loading → done.
 * On garde la ligne visible après résolution mais grisée + badge "résolu". */

import { CheckCircle2, ShieldOff, Trash2, UserX, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import {
  dismissCircleReport,
  resolveCircleReport,
} from "../reports-actions";

type Report = {
  id: string;
  target_kind: "post" | "comment" | "chat_message" | "member";
  target_id: string;
  reason: string;
  note: string | null;
  status: "open" | "in_review" | "resolved" | "dismissed";
  reporter_id: string;
  created_at: string;
  resolved_at: string | null;
  resolution_kind: string | null;
};

type Reporter = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
} | null;

type Props = {
  report: Report;
  reasonLabel: string;
  reporter: Reporter;
  circleSlug: string;
};

const KIND_LABEL: Record<Report["target_kind"], string> = {
  post: "post",
  comment: "commentaire",
  chat_message: "message",
  member: "membre",
};

export function ReportRow({ report, reasonLabel, reporter, circleSlug }: Props) {
  const [status, setStatus] = useState(report.status);
  const [isPending, startTransition] = useTransition();

  function handleResolve(
    kind:
      | "content_removed"
      | "member_warned"
      | "member_muted"
      | "member_banned"
      | "no_action",
  ) {
    startTransition(async () => {
      const res = await resolveCircleReport({
        circleSlug,
        reportId: report.id,
        resolutionKind: kind,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Signalement résolu.");
      setStatus("resolved");
    });
  }

  function handleDismiss() {
    startTransition(async () => {
      const res = await dismissCircleReport({
        circleSlug,
        reportId: report.id,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast("Signalement classé sans suite.");
      setStatus("dismissed");
    });
  }

  const closed = status === "resolved" || status === "dismissed";

  return (
    <li
      className={cn(
        "rounded-2xl border p-3.5 transition-opacity",
        closed
          ? "bg-bg-soft border-line opacity-60"
          : "bg-white border-line",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar
          src={reporter?.avatar_url ?? null}
          fullName={reporter?.full_name ?? reporter?.username ?? "?"}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <span className="font-bold text-night">
              {reporter?.full_name ?? reporter?.username ?? "Utilisateur"}
            </span>
            <span className="text-night-dim">a signalé un</span>
            <span className="font-bold text-night">
              {KIND_LABEL[report.target_kind]}
            </span>
            <span className="text-night-dim">·</span>
            <span className="inline-flex items-center h-4 px-1.5 rounded-full bg-rose-50 border border-rose-200 text-[9.5px] font-bold uppercase tracking-wider text-rose-700">
              {reasonLabel}
            </span>
            <span className="ml-auto text-[10px] text-night-dim/70">
              {new Date(report.created_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {report.note ? (
            <p className="mt-1.5 text-[12px] text-night-dim leading-relaxed line-clamp-2">
              &laquo; {report.note} &raquo;
            </p>
          ) : null}
          {closed ? (
            <p className="mt-2 text-[10.5px] font-bold uppercase tracking-wider text-emerald-700">
              ✓{" "}
              {status === "resolved"
                ? `Résolu${report.resolution_kind ? ` (${report.resolution_kind})` : ""}`
                : "Classé sans suite"}
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <ActionPill
                onClick={() => handleResolve("content_removed")}
                disabled={isPending}
                icon={Trash2}
                label="Supprimer contenu"
                tone="danger"
              />
              <ActionPill
                onClick={() => handleResolve("member_warned")}
                disabled={isPending}
                icon={ShieldOff}
                label="Avertir"
                tone="warning"
              />
              <ActionPill
                onClick={() => handleResolve("member_banned")}
                disabled={isPending}
                icon={UserX}
                label="Bannir"
                tone="danger"
              />
              <ActionPill
                onClick={() => handleResolve("no_action")}
                disabled={isPending}
                icon={CheckCircle2}
                label="OK, rien à faire"
                tone="default"
              />
              <ActionPill
                onClick={handleDismiss}
                disabled={isPending}
                icon={XCircle}
                label="Classer"
                tone="default"
              />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function ActionPill({
  onClick,
  disabled,
  icon: Icon,
  label,
  tone,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: typeof Trash2;
  label: string;
  tone: "danger" | "warning" | "default";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 text-rose-700 hover:bg-rose-50"
      : tone === "warning"
        ? "border-amber-200 text-amber-700 hover:bg-amber-50"
        : "border-line text-night-dim hover:bg-bg-soft";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 h-6 px-2 rounded-full bg-white border text-[10.5px] font-bold transition-colors disabled:opacity-50 ${toneClass}`}
    >
      <Icon className="w-3 h-3" aria-hidden />
      {label}
    </button>
  );
}
