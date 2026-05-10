"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { UserAdPreferences } from "@/lib/database.types";
import { saveAdPreferences } from "./actions";

const BLOCKABLE_CATEGORIES = [
  { id: "alcool", label: "Alcool" },
  { id: "paris_sportifs_anj", label: "Paris sportifs" },
  { id: "rencontres_adultes", label: "Rencontres adultes" },
  { id: "finance_credit", label: "Finance / Crédit" },
  { id: "assurance", label: "Assurance" },
  { id: "immobilier", label: "Immobilier" },
  { id: "sante_para_medical", label: "Santé / Para-médical" },
  { id: "juridique", label: "Juridique" },
  { id: "amaigrissement_promesses_miracles", label: "Régimes / Minceur" },
];

export function AdsPrivacyForm({
  initial,
}: {
  initial: UserAdPreferences;
}) {
  const [pending, startTransition] = useTransition();
  const [personalized, setPersonalized] = useState(
    initial.personalized_ads_consent,
  );
  const [behavioral, setBehavioral] = useState(initial.behavioral_data_consent);
  const [location, setLocation] = useState(initial.location_data_consent);
  const [blockedCats, setBlockedCats] = useState<string[]>(
    initial.blocked_categories ?? [],
  );

  function toggleCategory(id: string) {
    setBlockedCats((cats) =>
      cats.includes(id) ? cats.filter((c) => c !== id) : [...cats, id],
    );
  }

  function save() {
    startTransition(async () => {
      const result = await saveAdPreferences({
        personalized_ads_consent: personalized,
        behavioral_data_consent: behavioral,
        location_data_consent: location,
        blocked_categories: blockedCats,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Préférences enregistrées.");
    });
  }

  return (
    <section className="px-5 sm:px-8 pb-4">
      <div className="rounded-2xl bg-white border border-line overflow-hidden">
        <Toggle
          label="Publicités personnalisées"
          description="Si désactivé, tu ne verras que des publicités contextuelles (basées sur la page consultée, pas sur ton profil)."
          checked={personalized}
          onChange={setPersonalized}
        />
        <Toggle
          label="Utiliser mes données comportementales"
          description="Likes, commentaires, partages, temps de lecture. Désactive pour ne pas être profilé sur la base de tes interactions DIVARC."
          checked={behavioral}
          onChange={setBehavioral}
          disabled={!personalized}
        />
        <Toggle
          label="Utiliser ma localisation"
          description="Pour recevoir des publicités d'annonceurs locaux uniquement."
          checked={location}
          onChange={setLocation}
          disabled={!personalized}
        />
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-line p-4 sm:p-5">
        <h3 className="text-[13px] font-semibold text-night mb-1.5">
          Bloquer des catégories d&apos;annonceurs
        </h3>
        <p className="text-[12px] text-night-muted mb-3">
          Tu ne verras plus de publicités liées à ces secteurs.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {BLOCKABLE_CATEGORIES.map((c) => {
            const blocked = blockedCats.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.id)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                  blocked
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-line bg-white text-night-muted hover:bg-bg-soft"
                }`}
              >
                {blocked ? "✗" : "+"} {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-night text-cream text-[13px] font-semibold disabled:opacity-50 hover:bg-night/90"
        >
          {pending ? "Enregistrement…" : "Enregistrer mes préférences"}
        </button>
      </div>
    </section>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 px-4 py-3.5 border-b border-line last:border-b-0 ${
        disabled ? "opacity-50" : "hover:bg-bg-soft cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 accent-night shrink-0"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-night">
          {label}
        </span>
        <span className="block text-[11.5px] text-night-muted mt-0.5 leading-snug">
          {description}
        </span>
      </span>
    </label>
  );
}
