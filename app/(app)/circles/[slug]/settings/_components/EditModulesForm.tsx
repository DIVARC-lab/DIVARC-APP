"use client";

import { Loader2, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { CircleModules } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { updateCircleSettings } from "../../../actions";

const MODULES_LIST: Array<{
  key: keyof CircleModules;
  label: string;
  desc: string;
  alwaysOn?: boolean;
  comingSoon?: boolean;
}> = [
  { key: "social_feed", label: "Fil social", desc: "Posts + discussions", alwaysOn: true },
  { key: "events", label: "Événements", desc: "Meetups, webinaires, RSVP" },
  { key: "polls", label: "Sondages", desc: "Vote rapide dans les posts" },
  { key: "marketplace", label: "Marketplace", desc: "Annonces thématiques" },
  { key: "jobs", label: "Job board", desc: "Offres d'emploi gratuites" },
  { key: "library", label: "Bibliothèque", desc: "Ressources curées" },
  { key: "wiki", label: "Wiki", desc: "Pages éditables dans la Bibliothèque" },
  { key: "mentorship", label: "Mentorat", desc: "Mentors et mentees du cercle" },
];

type Props = {
  circleId: string;
  initial: CircleModules;
};

export function EditModulesForm({ circleId, initial }: Props) {
  const [modules, setModules] = useState<CircleModules>(initial);
  const [pending, startTransition] = useTransition();

  function toggle(key: keyof CircleModules) {
    setModules((m) => ({ ...m, [key]: !m[key] }));
  }

  function submit() {
    startTransition(async () => {
      const result = await updateCircleSettings(circleId, { modules });
      if (!result.ok) toast.error(result.error ?? "Échec.");
      else toast.success("Modules mis à jour.");
    });
  }

  return (
    <div className="space-y-2">
      {MODULES_LIST.map((mod) => {
        const checked = modules[mod.key];
        const disabled = mod.alwaysOn || mod.comingSoon;
        return (
          <label
            key={mod.key}
            className={cn(
              "flex items-start gap-3 p-2.5 rounded-xl border transition-colors cursor-pointer",
              checked
                ? "bg-gold/5 border-gold/30"
                : "bg-white border-line hover:border-night/30",
              disabled && "opacity-60 cursor-not-allowed",
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(mod.key)}
              className="mt-0.5 w-4 h-4 accent-gold-deep"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-night">
                {mod.label}
                {mod.alwaysOn ? (
                  <span className="ml-2 text-[9px] uppercase tracking-wider text-gold-deep font-extrabold">
                    · Inclus
                  </span>
                ) : null}
                {mod.comingSoon ? (
                  <span className="ml-2 text-[9px] uppercase tracking-wider text-night-dim font-extrabold">
                    · Bientôt
                  </span>
                ) : null}
              </p>
              <p className="text-[11px] text-night-dim">{mod.desc}</p>
            </div>
          </label>
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
