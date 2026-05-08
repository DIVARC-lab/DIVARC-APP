"use client";

import { Plus } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, FieldHint, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createSavedSearch } from "../actions";

type Option = { value: string; label: string };

type Props = {
  categories: Option[];
  jobTypes: Option[];
  workModes: Option[];
};

const EXPERIENCE_OPTIONS: Option[] = [
  { value: "debutant", label: "Débutant" },
  { value: "junior", label: "Junior" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "senior", label: "Senior" },
  { value: "expert", label: "Expert" },
];

export function CreateAlertCard({ categories, jobTypes, workModes }: Props) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createSavedSearch(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Alerte créée. Tu seras notifié dès qu'une offre matche ✨");
      // Reset form via reload
      const form = document.querySelector<HTMLFormElement>(
        "form[data-alert-form]",
      );
      form?.reset();
    });
  }

  return (
    <article className="p-6 rounded-3xl bg-white border-2 border-night/10 shadow-soft">
      <h2 className="font-display text-xl text-night mb-1">
        Nouvelle alerte
      </h2>
      <p className="text-sm text-muted mb-5">
        Au moins un critère parmi : mots-clés, catégorie, type, mode, expérience
        ou ville.
      </p>
      <form action={handleSubmit} data-alert-form className="space-y-4">
        <Field>
          <FieldLabel htmlFor="al_label" required>
            Nom de l&apos;alerte
          </FieldLabel>
          <Input
            id="al_label"
            name="label"
            required
            maxLength={80}
            placeholder="Ex. Dev senior remote Paris"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="al_query">Mots-clés</FieldLabel>
          <Input
            id="al_query"
            name="query"
            maxLength={120}
            placeholder="Ex. React, TypeScript, fintech..."
          />
          <FieldHint>
            Cherche dans le titre, la description et le nom de l&apos;entreprise.
          </FieldHint>
        </Field>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="al_category">Catégorie</FieldLabel>
            <Select id="al_category" name="category" defaultValue="">
              <option value="">Toutes</option>
              {categories.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="al_job_type">Type</FieldLabel>
            <Select id="al_job_type" name="job_type" defaultValue="">
              <option value="">Tous</option>
              {jobTypes.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="al_work_mode">Mode</FieldLabel>
            <Select id="al_work_mode" name="work_mode" defaultValue="">
              <option value="">Tous</option>
              {workModes.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="al_experience">Niveau</FieldLabel>
            <Select
              id="al_experience"
              name="experience_level"
              defaultValue=""
            >
              <option value="">Tous</option>
              {EXPERIENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="al_location">Ville / pays</FieldLabel>
            <Input
              id="al_location"
              name="location"
              maxLength={120}
              placeholder="Ex. Paris, Dakar, Cameroun..."
            />
            <FieldHint>
              Recherche partielle (« Pa » match « Paris » et « Padoue »).
            </FieldHint>
          </Field>
        </div>

        <div className="flex justify-end pt-3 border-t border-line">
          <Button type="submit" loading={pending} size="md">
            <Plus className="w-4 h-4" aria-hidden />
            Créer l&apos;alerte
          </Button>
        </div>
      </form>
    </article>
  );
}
