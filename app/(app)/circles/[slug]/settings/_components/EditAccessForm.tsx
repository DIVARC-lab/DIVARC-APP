"use client";

import { Check, Globe, Loader2, Lock, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type {
  CircleJoinPolicy,
  CircleType,
  CircleVisibility,
} from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { updateCircleSettings } from "../../../actions";

const TYPE_OPTIONS: Array<{
  value: CircleType;
  label: string;
  desc: string;
  icon: typeof Globe;
}> = [
  { value: "open", label: "Ouvert", desc: "Adhésion instantanée", icon: Globe },
  { value: "semi_open", label: "Semi-ouvert", desc: "Demande d'adhésion", icon: Globe },
  { value: "private", label: "Privé", desc: "Sur invitation", icon: Lock },
  { value: "hidden", label: "Caché", desc: "Invisible publiquement", icon: Lock },
];

type Props = {
  circleId: string;
  initial: {
    type: CircleType;
    join_policy: CircleJoinPolicy;
    visibility: CircleVisibility;
  };
};

export function EditAccessForm({ circleId, initial }: Props) {
  const [type, setType] = useState<CircleType>(initial.type);
  const [pending, startTransition] = useTransition();

  function selectType(t: CircleType) {
    setType(t);
  }

  function submit() {
    const derivedPolicy: CircleJoinPolicy =
      type === "open"
        ? "instant"
        : type === "semi_open"
          ? "request"
          : "invite_only";
    const derivedVisibility: CircleVisibility =
      type === "hidden" ? "invite_only" : "public";

    startTransition(async () => {
      const result = await updateCircleSettings(circleId, {
        type,
        join_policy: derivedPolicy,
        visibility: derivedVisibility,
      });
      if (!result.ok) toast.error(result.error ?? "Échec.");
      else toast.success("Accès mis à jour.");
    });
  }

  return (
    <div className="space-y-2">
      {TYPE_OPTIONS.map((opt) => {
        const active = type === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => selectType(opt.value)}
            className={cn(
              "w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors",
              active
                ? "bg-night text-cream border-night"
                : "bg-white border-line hover:border-night/30",
            )}
          >
            <Icon
              className={cn(
                "w-4 h-4 shrink-0",
                active ? "text-cream" : "text-night-dim",
              )}
              aria-hidden
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold">{opt.label}</p>
              <p
                className={cn(
                  "text-[11px]",
                  active ? "text-cream/80" : "text-night-dim",
                )}
              >
                {opt.desc}
              </p>
            </div>
            {active ? <Check className="w-4 h-4 shrink-0" aria-hidden /> : null}
          </button>
        );
      })}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-night text-cream text-[12px] font-extrabold hover:bg-night-soft transition-colors disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Save className="w-3.5 h-3.5" aria-hidden />
          )}
          Enregistrer
        </button>
      </div>
    </div>
  );
}
