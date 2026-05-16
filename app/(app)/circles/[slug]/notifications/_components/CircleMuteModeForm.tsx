"use client";

/* Sprint D.2 — Toggle 3-positions (all / mentions_only / muted) qui
 * s'applique en plus des prefs granulaires existantes. Quand muted,
 * AUCUNE notif n'est envoyée (announcement post, like, etc.). */

import { Bell, BellOff, AtSign } from "lucide-react";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import type { CircleNotificationMode } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { setCircleNotificationMode } from "../../notification-prefs-actions";

type Props = {
  circleId: string;
  circleSlug: string;
  initial: CircleNotificationMode;
};

const OPTIONS: {
  value: CircleNotificationMode;
  label: string;
  icon: typeof Bell;
  description: string;
}[] = [
  {
    value: "all",
    label: "Tout",
    icon: Bell,
    description: "Reçois toutes les notifs de ce cercle.",
  },
  {
    value: "mentions_only",
    label: "Mentions",
    icon: AtSign,
    description: "Uniquement quand quelqu'un te mentionne.",
  },
  {
    value: "muted",
    label: "Muet",
    icon: BellOff,
    description: "Aucune notif. Tu verras le contenu en visitant le cercle.",
  },
];

export function CircleMuteModeForm({ circleId, circleSlug, initial }: Props) {
  const [mode, setMode] = useState<CircleNotificationMode>(initial);
  const [isPending, startTransition] = useTransition();

  function handleSelect(next: CircleNotificationMode) {
    if (next === mode) return;
    const previous = mode;
    setMode(next);
    startTransition(async () => {
      const res = await setCircleNotificationMode({
        circleId,
        circleSlug,
        mode: next,
      });
      if (!res.ok) {
        toast.error(res.error);
        setMode(previous);
        return;
      }
      toast.success("Préférence enregistrée ✓");
    });
  }

  return (
    <div className="rounded-2xl bg-white border border-line p-4 mb-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-night-dim mb-2">
        Niveau de notifications
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = mode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              disabled={isPending}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-center transition-colors disabled:opacity-50",
                active
                  ? "border-night bg-night text-bg"
                  : "border-line bg-white text-night-dim hover:border-night/30 hover:text-night",
              )}
            >
              <Icon className="w-4 h-4" aria-hidden />
              <span className="text-[11px] font-bold">{opt.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10.5px] text-night-dim leading-relaxed">
        {OPTIONS.find((o) => o.value === mode)?.description}
      </p>
    </div>
  );
}
