"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  deleteAutomodRule,
  toggleAutomodRule,
} from "@/app/(app)/circles/actions";
import type { CircleAutomodRule } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";

const TYPE_LABEL: Record<string, string> = {
  slow_mode: "Mode lent",
  word_filter: "Filtre de mots",
  report_threshold: "Seuil signalements",
  link_filter: "Filtre liens",
};

const ACTION_LABEL: Record<string, string> = {
  flag: "Signaler",
  hide: "Masquer",
  require_approval: "Mise en attente",
};

type Props = {
  rule: CircleAutomodRule;
};

export function AutomodRuleRow({ rule }: Props) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await toggleAutomodRule(rule.id);
      if (!result.ok) toast.error(result.error ?? "Action impossible.");
      else
        toast.success(
          result.enabled ? "Règle activée." : "Règle désactivée.",
        );
    });
  }

  function remove() {
    if (!confirm("Supprimer cette règle ?")) return;
    startTransition(async () => {
      const result = await deleteAutomodRule(rule.id);
      if (!result.ok) toast.error(result.error ?? "Suppression impossible.");
      else toast.success("Règle supprimée.");
    });
  }

  /* Résumé lisible de la config. */
  const cfg = rule.config;
  let summary = "";
  if (rule.rule_type === "slow_mode") {
    summary = `${(cfg as { max_posts?: number }).max_posts ?? "?"} posts max / ${(cfg as { window_minutes?: number }).window_minutes ?? "?"} min`;
  } else if (rule.rule_type === "word_filter") {
    const words = (cfg as { words?: string[] }).words ?? [];
    summary = `${words.length} mot${words.length > 1 ? "s" : ""}`;
  } else if (rule.rule_type === "report_threshold") {
    summary = `Seuil : ${(cfg as { threshold?: number }).threshold ?? "?"}`;
  } else if (rule.rule_type === "link_filter") {
    const allow = (cfg as { allowlist?: string[] }).allowlist ?? [];
    summary = `${allow.length} domaine${allow.length > 1 ? "s" : ""} autorisé${allow.length > 1 ? "s" : ""}`;
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3",
        !rule.enabled && "opacity-60",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2 h-5 rounded-full bg-night/10 text-night text-[10px] font-extrabold uppercase tracking-wider">
            {TYPE_LABEL[rule.rule_type] ?? rule.rule_type}
          </span>
          <span className="inline-flex items-center px-2 h-5 rounded-full bg-gold/15 text-gold-deep text-[10px] font-extrabold uppercase tracking-wider">
            → {ACTION_LABEL[rule.on_match_action] ?? rule.on_match_action}
          </span>
          {rule.match_count > 0 ? (
            <span className="text-[10px] text-night-dim tabular-nums">
              {rule.match_count} match{rule.match_count > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[12px] text-night-soft">{summary}</p>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={rule.enabled}
        className={cn(
          "shrink-0 inline-flex items-center h-7 px-2.5 rounded-full text-[10.5px] font-extrabold transition-colors disabled:opacity-50",
          rule.enabled
            ? "bg-emerald-100 text-emerald-700"
            : "bg-bg-soft text-night-dim",
        )}
      >
        {pending ? (
          <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
        ) : null}
        {rule.enabled ? "Active" : "Inactive"}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label="Supprimer la règle"
        className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-red-50 text-night-dim hover:text-red-600 transition-colors disabled:opacity-50"
      >
        <Trash2 className="w-3.5 h-3.5" aria-hidden />
      </button>
    </div>
  );
}
