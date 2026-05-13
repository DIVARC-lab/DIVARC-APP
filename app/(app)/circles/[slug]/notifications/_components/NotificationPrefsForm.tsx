"use client";

import {
  Bell,
  Briefcase,
  Calendar,
  Loader2,
  Mail,
  MessageSquare,
  Save,
  Store,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateCircleNotificationPrefs } from "@/app/(app)/circles/actions";
import type { CircleNotificationPreferences } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";

type Props = {
  circleId: string;
  initial: CircleNotificationPreferences;
};

const POST_OPTIONS = [
  { value: "all", label: "Tout (chaque post)" },
  { value: "highlights", label: "Highlights (sélection)" },
  { value: "mentions_only", label: "Mentions uniquement" },
  { value: "off", label: "Aucune" },
] as const;

const MARKETPLACE_OPTIONS = [
  { value: "all", label: "Toutes" },
  { value: "matching_interests", label: "Selon mes intérêts" },
  { value: "off", label: "Aucune" },
] as const;

const JOBS_OPTIONS = [
  { value: "all", label: "Toutes" },
  { value: "matching_profile", label: "Selon mon profil" },
  { value: "off", label: "Aucune" },
] as const;

const EVENTS_OPTIONS = [
  { value: "all", label: "Tous les events" },
  { value: "rsvp_only", label: "Mes RSVP uniquement" },
  { value: "off", label: "Aucune" },
] as const;

export function NotificationPrefsForm({ circleId, initial }: Props) {
  const [prefs, setPrefs] = useState<CircleNotificationPreferences>(initial);
  const [pending, startTransition] = useTransition();

  function setPref<K extends keyof CircleNotificationPreferences>(
    key: K,
    value: CircleNotificationPreferences[K],
  ) {
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  function submit() {
    startTransition(async () => {
      const result = await updateCircleNotificationPrefs(circleId, prefs);
      if (!result.ok) toast.error(result.error ?? "Échec.");
      else toast.success("Préférences enregistrées.");
    });
  }

  return (
    <div className="space-y-4">
      <RadioGroup
        icon={MessageSquare}
        title="Nouveaux posts"
        value={prefs.new_posts}
        options={POST_OPTIONS}
        onChange={(v) => setPref("new_posts", v)}
      />
      <RadioGroup
        icon={Store}
        title="Marketplace"
        value={prefs.new_marketplace}
        options={MARKETPLACE_OPTIONS}
        onChange={(v) => setPref("new_marketplace", v)}
      />
      <RadioGroup
        icon={Briefcase}
        title="Jobs"
        value={prefs.new_jobs}
        options={JOBS_OPTIONS}
        onChange={(v) => setPref("new_jobs", v)}
      />
      <RadioGroup
        icon={Calendar}
        title="Événements"
        value={prefs.new_events}
        options={EVENTS_OPTIONS}
        onChange={(v) => setPref("new_events", v)}
      />

      <div className="rounded-2xl bg-white border border-line divide-y divide-line overflow-hidden">
        <SwitchRow
          icon={Bell}
          label="Mentions de moi (@)"
          checked={prefs.mentions}
          onChange={(v) => setPref("mentions", v)}
        />
        <SwitchRow
          icon={MessageSquare}
          label="Réponses directes à mes posts"
          checked={prefs.direct_replies}
          onChange={(v) => setPref("direct_replies", v)}
        />
        <SwitchRow
          icon={Bell}
          label="Messages des modérateurs"
          checked={prefs.moderator_messages}
          onChange={(v) => setPref("moderator_messages", v)}
        />
        <SwitchRow
          icon={Mail}
          label="Récap hebdomadaire (dimanche)"
          checked={prefs.weekly_digest}
          onChange={(v) => setPref("weekly_digest", v)}
        />
      </div>

      <div className="flex justify-end">
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

function RadioGroup<T extends string>({
  icon: Icon,
  title,
  value,
  options,
  onChange,
}: {
  icon: typeof Bell;
  title: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="rounded-2xl bg-white border border-line p-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className="w-4 h-4 text-gold-deep" aria-hidden />
        <h3 className="text-[13px] font-extrabold text-night">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center h-8 px-3 rounded-full text-[12px] font-bold transition-colors",
                active
                  ? "bg-night text-cream"
                  : "bg-bg-soft text-night-dim hover:bg-line",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SwitchRow({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: typeof Bell;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-bg-soft transition-colors">
      <span className="inline-flex items-center gap-2 text-[13px] text-night">
        <Icon className="w-4 h-4 text-night-dim" aria-hidden />
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 rounded-full transition-colors",
          checked ? "bg-night" : "bg-line",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-0.5 inline-block w-4 h-4 rounded-full bg-white transition-all",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </button>
    </label>
  );
}
