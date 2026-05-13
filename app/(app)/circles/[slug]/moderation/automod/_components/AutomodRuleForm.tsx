"use client";

import { Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createAutomodRule } from "@/app/(app)/circles/actions";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { CircleAutomodRuleType } from "@/lib/database.types";

type RuleType = CircleAutomodRuleType;
type Action = "flag" | "hide" | "require_approval";

const TYPE_LABELS: Record<RuleType, string> = {
  slow_mode: "Mode lent (slow mode)",
  word_filter: "Filtre de mots",
  report_threshold: "Seuil de signalements",
  link_filter: "Filtre de liens externes",
};

const TYPE_DESC: Record<RuleType, string> = {
  slow_mode:
    "Limite le nombre de posts qu'un membre peut publier dans une fenêtre de temps.",
  word_filter:
    "Bloque ou signale les posts contenant des mots-clés interdits.",
  report_threshold:
    "Si un post reçoit X signalements, action automatique sur le post.",
  link_filter:
    "Filtre les liens externes (whitelist ou blacklist de domaines).",
};

type Props = {
  circleId: string;
  onClose: () => void;
};

export function AutomodRuleForm({ circleId, onClose }: Props) {
  const [ruleType, setRuleType] = useState<RuleType>("slow_mode");
  const [action, setAction] = useState<Action>("flag");
  const [pending, startTransition] = useTransition();

  /* Config par type. */
  const [maxPosts, setMaxPosts] = useState(5);
  const [windowMinutes, setWindowMinutes] = useState(60);
  const [wordsInput, setWordsInput] = useState("");
  const [threshold, setThreshold] = useState(3);
  const [allowlist, setAllowlist] = useState("");

  function buildConfig(): Record<string, unknown> {
    switch (ruleType) {
      case "slow_mode":
        return { max_posts: maxPosts, window_minutes: windowMinutes };
      case "word_filter":
        return {
          words: wordsInput
            .split(/[\n,]/)
            .map((w) => w.trim())
            .filter((w) => w.length > 0)
            .slice(0, 200),
          case_insensitive: true,
        };
      case "report_threshold":
        return { threshold };
      case "link_filter":
        return {
          allowlist: allowlist
            .split(/[\n,]/)
            .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, ""))
            .filter((d) => d.length > 0)
            .slice(0, 50),
          block_others: true,
        };
    }
  }

  function submit() {
    const config = buildConfig();
    /* Validation minimum côté client. */
    if (ruleType === "word_filter") {
      const words = (config as { words?: string[] }).words ?? [];
      if (words.length === 0) {
        toast.error("Ajoute au moins un mot-clé.");
        return;
      }
    }

    startTransition(async () => {
      const result = await createAutomodRule(circleId, {
        rule_type: ruleType,
        config,
        on_match_action: action,
        enabled: true,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Création impossible.");
        return;
      }
      toast.success("Règle ajoutée.");
      onClose();
    });
  }

  return (
    <div className="rounded-2xl bg-white border border-line p-4 space-y-3">
      <header className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-extrabold uppercase tracking-wider text-gold-deep">
          · Nouvelle règle
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="w-7 h-7 rounded-full hover:bg-bg-soft inline-flex items-center justify-center"
        >
          <X className="w-3.5 h-3.5 text-night-dim" aria-hidden />
        </button>
      </header>

      <div>
        <label className="block text-[11px] font-bold text-night mb-1">
          Type de règle
        </label>
        <Select
          value={ruleType}
          onChange={(e) => setRuleType(e.target.value as RuleType)}
        >
          {Object.entries(TYPE_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-[10.5px] text-night-dim">
          {TYPE_DESC[ruleType]}
        </p>
      </div>

      {/* Config dynamique selon ruleType. */}
      {ruleType === "slow_mode" ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-bold text-night mb-1">
              Max posts
            </label>
            <Input
              type="number"
              min={1}
              max={100}
              value={maxPosts}
              onChange={(e) => setMaxPosts(Number(e.target.value) || 1)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-night mb-1">
              Fenêtre (min)
            </label>
            <Input
              type="number"
              min={1}
              max={1440}
              value={windowMinutes}
              onChange={(e) => setWindowMinutes(Number(e.target.value) || 1)}
            />
          </div>
        </div>
      ) : null}

      {ruleType === "word_filter" ? (
        <div>
          <label className="block text-[11px] font-bold text-night mb-1">
            Mots interdits (un par ligne ou séparés par virgule)
          </label>
          <Textarea
            rows={3}
            value={wordsInput}
            onChange={(e) => setWordsInput(e.target.value)}
            placeholder="spam, scam, …"
            maxLength={4000}
          />
        </div>
      ) : null}

      {ruleType === "report_threshold" ? (
        <div>
          <label className="block text-[11px] font-bold text-night mb-1">
            Seuil de signalements
          </label>
          <Input
            type="number"
            min={2}
            max={50}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value) || 3)}
          />
        </div>
      ) : null}

      {ruleType === "link_filter" ? (
        <div>
          <label className="block text-[11px] font-bold text-night mb-1">
            Domaines autorisés (le reste est bloqué)
          </label>
          <Textarea
            rows={3}
            value={allowlist}
            onChange={(e) => setAllowlist(e.target.value)}
            placeholder="youtube.com, github.com, …"
            maxLength={2000}
          />
        </div>
      ) : null}

      <div>
        <label className="block text-[11px] font-bold text-night mb-1">
          Action en cas de match
        </label>
        <Select
          value={action}
          onChange={(e) => setAction(e.target.value as Action)}
        >
          <option value="flag">Signaler aux modos (visible)</option>
          <option value="require_approval">
            Mise en file d&apos;approbation
          </option>
          <option value="hide">Masquer le post automatiquement</option>
        </Select>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="h-9 px-3 rounded-full text-[12px] font-bold text-night-dim hover:text-night transition-colors"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-night text-cream text-[12px] font-extrabold hover:bg-night-soft transition-colors disabled:opacity-50"
        >
          <Plus className="w-3 h-3" aria-hidden />
          Ajouter la règle
        </button>
      </div>
    </div>
  );
}
