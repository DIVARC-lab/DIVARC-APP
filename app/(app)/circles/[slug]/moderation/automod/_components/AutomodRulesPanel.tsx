"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import type { CircleAutomodRule } from "@/lib/database.types";
import { AutomodRuleForm } from "./AutomodRuleForm";
import { AutomodRuleRow } from "./AutomodRuleRow";

type Props = {
  circleId: string;
  initialRules: CircleAutomodRule[];
};

export function AutomodRulesPanel({ circleId, initialRules }: Props) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-3">
      {showForm ? (
        <AutomodRuleForm
          circleId={circleId}
          onClose={() => setShowForm(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-xl border border-dashed border-line text-night-dim text-[12px] font-bold hover:border-night/30 hover:text-night transition-colors"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden />
          Ajouter une règle
        </button>
      )}

      {initialRules.length === 0 ? (
        <p className="text-[12px] text-night-dim text-center py-4">
          Aucune règle AutoMod configurée pour ce cercle.
        </p>
      ) : (
        <ul className="rounded-2xl bg-white border border-line divide-y divide-line overflow-hidden">
          {initialRules.map((rule) => (
            <li key={rule.id}>
              <AutomodRuleRow rule={rule} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
