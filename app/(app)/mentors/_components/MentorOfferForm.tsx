"use client";

import { Save } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, FieldHint, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { CURRENCY_LABELS, type MentorOffer } from "@/lib/database.types";
import { upsertMentorOffer } from "../actions";

export function MentorOfferForm({ offer }: { offer: MentorOffer | null }) {
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await upsertMentorOffer(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Offre enregistrée ✨");
    });
  }

  return (
    <form action={submit} className="space-y-5">
      <Field>
        <FieldLabel htmlFor="m_bio" required>
          Présentation
        </FieldLabel>
        <textarea
          id="m_bio"
          name="bio"
          rows={6}
          required
          minLength={10}
          maxLength={4000}
          defaultValue={offer?.bio ?? ""}
          placeholder="Pourquoi tu serais un bon mentor, sur quels sujets, ton parcours..."
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="m_topics">Sujets</FieldLabel>
        <Input
          id="m_topics"
          name="topics"
          defaultValue={offer?.topics?.join(", ") ?? ""}
          placeholder="ex. carrière, react, freelance, levée de fonds"
        />
        <FieldHint>
          Séparés par des virgules, 12 max, 40 caractères chacun.
        </FieldHint>
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="m_rate">Tarif horaire</FieldLabel>
          <Input
            id="m_rate"
            name="hourly_rate"
            type="number"
            min={0}
            step={1}
            defaultValue={offer?.hourly_rate ?? ""}
          />
          <FieldHint>Laisse vide pour proposer gratuitement.</FieldHint>
        </Field>
        <Field>
          <FieldLabel htmlFor="m_currency">Devise</FieldLabel>
          <Select
            id="m_currency"
            name="rate_currency"
            defaultValue={offer?.rate_currency ?? ""}
          >
            <option value="">—</option>
            {Object.entries(CURRENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="m_languages">Langues</FieldLabel>
        <Input
          id="m_languages"
          name="languages"
          defaultValue={offer?.languages?.join(", ") ?? "fr"}
          placeholder="fr, en, ar, wo..."
        />
        <FieldHint>Codes courts, séparés par des virgules.</FieldHint>
      </Field>
      <Switch
        name="is_available"
        label="Disponible pour de nouvelles sessions"
        description="Désactive si tu es saturé. Tu n'apparaîtras plus dans la liste."
        defaultChecked={offer?.is_available ?? true}
      />
      <div className="flex justify-end pt-3 border-t border-line">
        <Button type="submit" loading={pending} size="lg">
          {!pending ? <Save className="w-4 h-4" aria-hidden /> : null}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
