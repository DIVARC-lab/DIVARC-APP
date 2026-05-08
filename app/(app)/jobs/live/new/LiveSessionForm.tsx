"use client";

import { Plus } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, FieldHint, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createLiveSession } from "../actions";

export function LiveSessionForm() {
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createLiveSession(formData);
      // En cas de succès le serveur fait redirect() (throw NEXT_REDIRECT),
      // donc on n'arrive ici qu'en cas d'erreur.
      if (result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form action={submit} className="space-y-5">
      <Field>
        <FieldLabel htmlFor="lv_title" required>
          Titre
        </FieldLabel>
        <Input
          id="lv_title"
          name="title"
          required
          minLength={5}
          maxLength={160}
          placeholder="Ex. Q&A recrutement Backend chez DIVARC"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="lv_desc">Description</FieldLabel>
        <textarea
          id="lv_desc"
          name="description"
          rows={5}
          maxLength={4000}
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
          placeholder="Programme, sujets abordés, à qui s'adresse ce live..."
        />
      </Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="lv_when" required>
            Date & heure
          </FieldLabel>
          <Input
            id="lv_when"
            name="scheduled_at"
            type="datetime-local"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="lv_dur" required>
            Durée
          </FieldLabel>
          <Select id="lv_dur" name="duration_min" defaultValue={60}>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>1 heure</option>
            <option value={90}>1 h 30</option>
            <option value={120}>2 heures</option>
          </Select>
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="lv_job">Offre liée (optionnel)</FieldLabel>
        <Input
          id="lv_job"
          name="job_id"
          type="text"
          placeholder="UUID de l'offre (laisse vide si générique)"
        />
        <FieldHint>
          Le picker complet arrive plus tard. Pour l&apos;instant : copie
          l&apos;ID depuis l&apos;URL d&apos;une de tes offres.
        </FieldHint>
      </Field>
      <div className="flex justify-end pt-3 border-t border-line">
        <Button type="submit" size="lg" loading={pending}>
          <Plus className="w-4 h-4" aria-hidden />
          Programmer le live
        </Button>
      </div>
    </form>
  );
}
