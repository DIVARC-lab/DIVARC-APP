"use client";

import { CalendarPlus } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, FieldHint, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { bookMentorSession } from "../actions";

const DURATIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 heure" },
  { value: 90, label: "1 h 30" },
  { value: 120, label: "2 heures" },
];

export function BookSessionForm({ mentorId }: { mentorId: string }) {
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    formData.set("mentor_id", mentorId);
    startTransition(async () => {
      const result = await bookMentorSession(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Demande envoyée. Le mentor sera notifié ✨");
      const form = document.querySelector<HTMLFormElement>("form[data-book-form]");
      form?.reset();
    });
  }

  return (
    <form action={submit} data-book-form className="space-y-4">
      <Field>
        <FieldLabel htmlFor="bk_topic" required>
          Sujet
        </FieldLabel>
        <Input
          id="bk_topic"
          name="topic"
          required
          maxLength={200}
          placeholder="Ex. Préparer mon entretien chez X"
        />
      </Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="bk_when">Date & heure souhaitées</FieldLabel>
          <Input id="bk_when" name="scheduled_at" type="datetime-local" />
          <FieldHint>Optionnel — le mentor confirmera.</FieldHint>
        </Field>
        <Field>
          <FieldLabel htmlFor="bk_dur">Durée</FieldLabel>
          <Select id="bk_dur" name="duration_min" defaultValue={30}>
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="bk_msg">Message</FieldLabel>
        <textarea
          id="bk_msg"
          name="message"
          rows={4}
          maxLength={2000}
          placeholder="Contexte, attentes, contraintes..."
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
        />
      </Field>
      <div className="flex justify-end pt-3 border-t border-line">
        <Button type="submit" loading={pending} size="md">
          <CalendarPlus className="w-4 h-4" aria-hidden />
          Demander la session
        </Button>
      </div>
    </form>
  );
}
