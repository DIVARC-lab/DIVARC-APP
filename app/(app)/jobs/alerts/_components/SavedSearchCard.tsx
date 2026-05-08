"use client";

import { Bell, BellOff, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import type { JobSavedSearch } from "@/lib/database.types";
import { deleteSavedSearch, toggleSearchAlerts } from "../actions";

const SUMMARY_LABELS: Record<string, string> = {
  cdi: "CDI",
  cdd: "CDD",
  freelance: "Freelance",
  mission: "Mission",
  alternance: "Alternance",
  stage: "Stage",
  benevolat: "Bénévolat",
  on_site: "Sur site",
  remote: "Télétravail",
  hybrid: "Hybride",
  debutant: "Débutant",
  junior: "Junior",
  intermediaire: "Intermédiaire",
  senior: "Senior",
  expert: "Expert",
};

export function SavedSearchCard({ alert }: { alert: JobSavedSearch }) {
  const [enabled, setEnabled] = useState(alert.alerts_enabled);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      const result = await toggleSearchAlerts(alert.id, next);
      if (!result.ok) {
        setEnabled(!next);
        toast.error(result.error);
      } else {
        toast.success(next ? "Alerte activée." : "Alerte mise en pause.");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Supprimer l'alerte "${alert.label}" ?`)) return;
    startTransition(async () => {
      const result = await deleteSavedSearch(alert.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Alerte supprimée.");
    });
  }

  // Build query string for the matching jobs page
  const params = new URLSearchParams();
  if (alert.query) params.set("q", alert.query);
  if (alert.category) params.set("category", alert.category);
  if (alert.job_type) params.set("type", alert.job_type);
  if (alert.work_mode) params.set("mode", alert.work_mode);
  const linkHref = params.toString() ? `/jobs?${params}` : "/jobs";

  const summary = [
    alert.category,
    alert.job_type ? SUMMARY_LABELS[alert.job_type] : null,
    alert.work_mode ? SUMMARY_LABELS[alert.work_mode] : null,
    alert.experience_level ? SUMMARY_LABELS[alert.experience_level] : null,
    alert.location,
  ].filter(Boolean);

  return (
    <article
      className={cn(
        "p-5 rounded-2xl border bg-white flex items-start justify-between gap-4 transition-opacity",
        enabled ? "border-line" : "border-line opacity-60",
      )}
    >
      <div className="flex-1 min-w-0">
        <Link
          href={linkHref}
          className="font-semibold text-night hover:underline truncate inline-block max-w-full"
        >
          {alert.label}
        </Link>
        {alert.query ? (
          <p className="text-sm text-night-muted truncate">
            « {alert.query} »
          </p>
        ) : null}
        {summary.length > 0 ? (
          <p className="mt-1 text-xs text-muted truncate">
            {summary.join(" · ")}
          </p>
        ) : (
          <p className="mt-1 text-xs italic text-muted">
            Toutes catégories confondues
          </p>
        )}
        {alert.last_notified_at ? (
          <p className="mt-1 text-[11px] text-gold-deep">
            Dernier match : {formatDate(alert.last_notified_at)}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={handleToggle}
          disabled={pending}
          aria-label={enabled ? "Désactiver" : "Activer"}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
            enabled
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-night/5 text-night-muted border border-line",
          )}
        >
          {pending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : enabled ? (
            <Bell className="w-4 h-4" />
          ) : (
            <BellOff className="w-4 h-4" />
          )}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          aria-label="Supprimer"
          className="w-9 h-9 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </article>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
