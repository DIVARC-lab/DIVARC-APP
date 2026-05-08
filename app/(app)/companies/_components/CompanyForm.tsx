"use client";

import { Save } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  createCompany,
  type CreateCompanyState,
} from "../actions";

const INITIAL: CreateCompanyState = { status: "idle" };

const SIZE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Non précisé" },
  { value: "1-10", label: "1 à 10" },
  { value: "11-50", label: "11 à 50" },
  { value: "51-200", label: "51 à 200" },
  { value: "201-500", label: "201 à 500" },
  { value: "501-1000", label: "501 à 1 000" },
  { value: "1001-5000", label: "1 001 à 5 000" },
  { value: "5001-10000", label: "5 001 à 10 000" },
  { value: "10000+", label: "10 000 et plus" },
];

export function CompanyForm() {
  const [state, formAction, pending] = useActionState<
    CreateCompanyState,
    FormData
  >(createCompany, INITIAL);

  useEffect(() => {
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="name" required>
            Nom de l&apos;entreprise
          </FieldLabel>
          <Input
            id="name"
            name="name"
            required
            maxLength={120}
            invalid={Boolean(errors.name)}
          />
          <FieldError>{errors.name}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="slug" required>
            Identifiant URL
          </FieldLabel>
          <Input
            id="slug"
            name="slug"
            required
            maxLength={60}
            placeholder="mon-entreprise"
            invalid={Boolean(errors.slug)}
          />
          <FieldHint>
            Apparaît dans l&apos;URL : divarc.app/companies/<strong>mon-entreprise</strong>
          </FieldHint>
          <FieldError>{errors.slug}</FieldError>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="tagline">Phrase d&apos;accroche</FieldLabel>
          <Input id="tagline" name="tagline" maxLength={200} />
          <FieldHint>200 caractères max — affichée sous le nom.</FieldHint>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <textarea
            id="description"
            name="description"
            rows={6}
            maxLength={4000}
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
            placeholder="Mission, valeurs, équipe, projets emblématiques..."
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="industry">Secteur</FieldLabel>
          <Input
            id="industry"
            name="industry"
            maxLength={80}
            placeholder="Tech, Finance, Mode..."
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="size_label">Effectif</FieldLabel>
          <Select id="size_label" name="size_label" defaultValue="">
            {SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="headquarters">Siège</FieldLabel>
          <Input
            id="headquarters"
            name="headquarters"
            maxLength={120}
            placeholder="Paris, Dakar, Yaoundé..."
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="founded_year">Fondée en</FieldLabel>
          <Input
            id="founded_year"
            name="founded_year"
            type="number"
            min={1800}
            max={new Date().getFullYear()}
          />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="website">Site web</FieldLabel>
          <Input
            id="website"
            name="website"
            type="url"
            placeholder="https://..."
            invalid={Boolean(errors.website)}
          />
          <FieldError>{errors.website}</FieldError>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="logo_url">URL du logo</FieldLabel>
          <Input
            id="logo_url"
            name="logo_url"
            type="url"
            placeholder="https://..."
          />
          <FieldHint>
            Carré, idéalement 256×256 minimum. L&apos;upload arrive plus tard.
          </FieldHint>
        </Field>
      </div>

      <div className="flex justify-end pt-4 border-t border-line">
        <Button type="submit" loading={pending} size="lg">
          {!pending ? <Save className="w-4 h-4" aria-hidden /> : null}
          {pending ? "Création..." : "Créer la page"}
        </Button>
      </div>
    </form>
  );
}
