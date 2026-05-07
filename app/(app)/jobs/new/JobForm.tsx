"use client";

import { Save } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
} from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CURRENCY_LABELS } from "@/lib/database.types";
import {
  EXPERIENCE_META,
  JOB_CATEGORY_LIST,
  JOB_TYPE_LIST,
  WORK_MODE_META,
  SALARY_PERIOD_META,
} from "@/lib/utils/jobs";
import { createJob, type JobFormState } from "../actions";

const INITIAL: JobFormState = { status: "idle" };

type JobFormProps = {
  defaultLocation: string | null;
  defaultCurrency: string;
};

export function JobForm({ defaultLocation, defaultCurrency }: JobFormProps) {
  const [state, formAction, pending] = useActionState<JobFormState, FormData>(
    createJob,
    INITIAL,
  );

  useEffect(() => {
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="space-y-7" noValidate>
      <Section title="L'offre" hint="Le titre, l'entreprise, ce qu'on cherche.">
        <div className="space-y-5">
          <Field>
            <FieldLabel htmlFor="title" required>
              Titre du poste
            </FieldLabel>
            <Input
              id="title"
              name="title"
              required
              minLength={3}
              maxLength={120}
              placeholder="Développeur·se Full-Stack Senior"
              invalid={Boolean(state.fieldErrors?.title)}
            />
            <FieldError>{state.fieldErrors?.title}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="company_name">Entreprise</FieldLabel>
            <Input
              id="company_name"
              name="company_name"
              maxLength={120}
              placeholder="DIVARC Lab"
              invalid={Boolean(state.fieldErrors?.company_name)}
            />
            <FieldHint>
              Laisse vide si tu publies en ton nom (freelance, particulier).
            </FieldHint>
          </Field>
          <Field>
            <FieldLabel htmlFor="description" required>
              Description
            </FieldLabel>
            <Textarea
              id="description"
              name="description"
              rows={8}
              required
              minLength={10}
              maxLength={8000}
              placeholder={`Mission · Responsabilités · Profil recherché · Avantages\nLes candidats sérieux apprécient quand tu détailles.`}
              invalid={Boolean(state.fieldErrors?.description)}
            />
            <FieldError>{state.fieldErrors?.description}</FieldError>
          </Field>
        </div>
      </Section>

      <Section title="Conditions" hint="Type de contrat, mode, niveau.">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field>
            <FieldLabel htmlFor="job_type" required>
              Type
            </FieldLabel>
            <Select id="job_type" name="job_type" defaultValue="cdi">
              {JOB_TYPE_LIST.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.emoji} {type.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="work_mode" required>
              Mode de travail
            </FieldLabel>
            <Select id="work_mode" name="work_mode" defaultValue="on_site">
              {Object.entries(WORK_MODE_META).map(([id, meta]) => (
                <option key={id} value={id}>
                  {meta.emoji} {meta.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="experience_level" required>
              Expérience
            </FieldLabel>
            <Select
              id="experience_level"
              name="experience_level"
              defaultValue="intermediaire"
            >
              {Object.entries(EXPERIENCE_META).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Catégorie & lieu">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="category" required>
              Catégorie
            </FieldLabel>
            <Select id="category" name="category" defaultValue="tech">
              {JOB_CATEGORY_LIST.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="location">Localisation</FieldLabel>
            <Input
              id="location"
              name="location"
              defaultValue={defaultLocation ?? ""}
              maxLength={120}
              placeholder="Paris, France"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Rémunération"
        hint="Optionnelle, mais les candidats apprécient la transparence."
      >
        <div className="grid sm:grid-cols-4 gap-4">
          <Field>
            <FieldLabel htmlFor="salary_min">Min</FieldLabel>
            <Input
              id="salary_min"
              name="salary_min"
              type="number"
              min={0}
              step={1}
              placeholder="40000"
              invalid={Boolean(state.fieldErrors?.salary_min)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="salary_max">Max</FieldLabel>
            <Input
              id="salary_max"
              name="salary_max"
              type="number"
              min={0}
              step={1}
              placeholder="60000"
              invalid={Boolean(state.fieldErrors?.salary_max)}
            />
            <FieldError>{state.fieldErrors?.salary_max}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="salary_currency">Devise</FieldLabel>
            <Select
              id="salary_currency"
              name="salary_currency"
              defaultValue={defaultCurrency}
            >
              <option value="">—</option>
              {Object.entries(CURRENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label.split(" · ")[0] ?? label} ({value})
                </option>
              ))}
            </Select>
            <FieldError>{state.fieldErrors?.salary_currency}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="salary_period">Période</FieldLabel>
            <Select
              id="salary_period"
              name="salary_period"
              defaultValue="year"
            >
              <option value="">—</option>
              {Object.entries(SALARY_PERIOD_META).map(([id, label]) => (
                <option key={id} value={id}>
                  {label.replace("/ ", "")}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <div className="flex items-center justify-end pt-2">
        <Button type="submit" loading={pending} size="lg">
          {!pending ? <Save className="w-4 h-4" aria-hidden /> : null}
          {pending ? "Publication..." : "Publier l'offre"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="p-6 sm:p-8 rounded-3xl bg-white border border-line shadow-soft">
      <header className="mb-5">
        <h2 className="font-display text-2xl text-night">{title}</h2>
        {hint ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}
