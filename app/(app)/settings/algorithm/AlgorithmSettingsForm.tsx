"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { runAction } from "@/lib/utils/clientAction";
import { cn } from "@/lib/utils/cn";
import type { UserAlgorithmSettings } from "@/lib/database.types";
import { saveAlgorithmSettings } from "./actions";

/* Form interactif des settings algorithme. Utilise des toggles
 * (role="switch") + section topics détectés.
 *
 * Pattern : optimistic UI — on update localement et on persiste en
 * background via server action. */

type Props = {
  initialSettings: UserAlgorithmSettings;
  topTopics: Array<[string, number]>;
};

export function AlgorithmSettingsForm({
  initialSettings,
  topTopics,
}: Props) {
  const [pending, startTransition] = useTransition();

  function toggle(field: keyof UserAlgorithmSettings, currentValue: boolean) {
    startTransition(async () => {
      const result = await runAction(
        () => saveAlgorithmSettings({ [field]: !currentValue }),
        {
          successMessage: "Préférence enregistrée.",
        },
      );
      if (!result?.ok) return;
    });
  }

  return (
    <>
      {/* Section Mode chronologique */}
      <section className="px-5 sm:px-8 pt-2 pb-4">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> Mode d&apos;affichage
        </h2>
        <div className="rounded-2xl bg-white border border-line p-4">
          <ToggleRow
            label="Mode chronologique strict"
            description="Désactive complètement le ranking algorithmique. Tu vois les posts de tes amis en ordre temporel inverse pur, sans personnalisation."
            checked={initialSettings.chronological_mode}
            onToggle={() =>
              toggle("chronological_mode", initialSettings.chronological_mode)
            }
            disabled={pending}
          />
        </div>
      </section>

      {/* Section consentements granulaires */}
      <section className="px-5 sm:px-8 pb-4">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> Mes consentements
        </h2>
        <div className="rounded-2xl bg-white border border-line divide-y divide-line">
          <ToggleRow
            label="Recommandations personnalisées"
            description="Adapter le feed à mon comportement (likes, durée de lecture, sujets visités)."
            checked={initialSettings.personalization_consent}
            onToggle={() =>
              toggle(
                "personalization_consent",
                initialSettings.personalization_consent,
              )
            }
            disabled={pending}
          />
          <ToggleRow
            label="Suggestions basées sur ma localisation"
            description="Utiliser ma ville/région pour les annonces marketplace, événements et profils proches."
            checked={initialSettings.location_consent}
            onToggle={() =>
              toggle("location_consent", initialSettings.location_consent)
            }
            disabled={pending}
          />
          <ToggleRow
            label="Suggestions basées sur mes contacts"
            description="Suggérer des amis ou personnes que je pourrais connaître."
            checked={initialSettings.contacts_consent}
            onToggle={() =>
              toggle("contacts_consent", initialSettings.contacts_consent)
            }
            disabled={pending}
          />
          <ToggleRow
            label="Suggestions publicitaires"
            description="Recevoir des contenus sponsorisés alignés à mes intérêts (utile plus tard quand DIVARC en proposera)."
            checked={initialSettings.ads_consent}
            onToggle={() =>
              toggle("ads_consent", initialSettings.ads_consent)
            }
            disabled={pending}
          />
        </div>
      </section>

      {/* Section topics détectés */}
      {topTopics.length > 0 ? (
        <section className="px-5 sm:px-8 pb-4">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
            <span className="text-gold-deep">·</span> Mes intérêts détectés
          </h2>
          <div className="rounded-2xl bg-white border border-line p-4 space-y-2">
            {topTopics.map(([topic, score]) => {
              const pct = Math.round((score / topTopics[0]![1]) * 100);
              return (
                <div key={topic} className="flex items-center gap-3">
                  <Sparkles
                    className="w-3.5 h-3.5 text-gold-deep shrink-0"
                    aria-hidden
                  />
                  <span className="flex-1 text-[13px] text-night truncate">
                    {topic}
                  </span>
                  <div className="w-24 h-1.5 rounded-full bg-bg-soft overflow-hidden">
                    <div
                      className="h-full bg-gold"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="px-5 sm:px-8 pb-4">
          <p className="rounded-2xl bg-white border border-line p-4 text-sm text-muted text-center">
            Pas encore d&apos;intérêts détectés. Ils apparaîtront ici quand tu
            auras interagi avec quelques posts.
          </p>
        </section>
      )}
    </>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-night">{label}</p>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          "shrink-0 relative w-11 h-6 rounded-full transition-colors",
          checked ? "bg-gold" : "bg-night/15",
          disabled && "opacity-60",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-soft transition-transform",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}
