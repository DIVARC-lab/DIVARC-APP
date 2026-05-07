"use client";

import { Save, Sparkles } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
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
import { CATEGORY_LIST, CONDITION_META } from "@/lib/utils/categories";
import { createListing, type ListingFormState } from "../actions";
import { PhotoUploader, type UploadedPhoto } from "./PhotoUploader";

const INITIAL: ListingFormState = { status: "idle" };

type ListingFormProps = {
  userId: string;
  defaultLocation: string | null;
  defaultCurrency: string;
};

export function ListingForm({
  userId,
  defaultLocation,
  defaultCurrency,
}: ListingFormProps) {
  const [state, formAction, pending] = useActionState<
    ListingFormState,
    FormData
  >(createListing, INITIAL);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  useEffect(() => {
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="space-y-7" noValidate>
      <input
        type="hidden"
        name="photos"
        value={JSON.stringify(
          photos.map((p) => ({ url: p.url, position: p.position })),
        )}
      />

      <Section
        title="Photos"
        hint="Une bonne photo vend l'annonce. Mets-en plusieurs."
      >
        <PhotoUploader userId={userId} onChange={setPhotos} />
      </Section>

      <Section title="Annonce" hint="Le titre et la description.">
        <div className="space-y-5">
          <Field>
            <FieldLabel htmlFor="title" required>
              Titre
            </FieldLabel>
            <Input
              id="title"
              name="title"
              type="text"
              required
              minLength={3}
              maxLength={120}
              placeholder="Tissu wax authentique 6 yards"
              invalid={Boolean(state.fieldErrors?.title)}
            />
            <FieldError>{state.fieldErrors?.title}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              name="description"
              rows={4}
              maxLength={4000}
              placeholder="Indique l'état, l'origine, les détails utiles..."
              invalid={Boolean(state.fieldErrors?.description)}
            />
            <FieldError>{state.fieldErrors?.description}</FieldError>
          </Field>
        </div>
      </Section>

      <Section title="Prix" hint="Indique un prix juste, multi-devise.">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="price_amount" required>
              Montant
            </FieldLabel>
            <Input
              id="price_amount"
              name="price_amount"
              type="number"
              min={0}
              step={0.01}
              required
              placeholder="0"
              invalid={Boolean(state.fieldErrors?.price_amount)}
            />
            <FieldHint>Mets 0 si c&apos;est gratuit.</FieldHint>
            <FieldError>{state.fieldErrors?.price_amount}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="price_currency" required>
              Devise
            </FieldLabel>
            <Select
              id="price_currency"
              name="price_currency"
              defaultValue={defaultCurrency}
            >
              {Object.entries(CURRENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label.split(" · ")[0] ?? label} ({value})
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Catégorie & état">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="category" required>
              Catégorie
            </FieldLabel>
            <Select id="category" name="category" defaultValue="autre" required>
              {CATEGORY_LIST.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="condition" required>
              État
            </FieldLabel>
            <Select id="condition" name="condition" defaultValue="used" required>
              {Object.entries(CONDITION_META).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Localisation" hint="Pour les acheteurs proches de toi.">
        <Field>
          <FieldLabel htmlFor="location">Ville</FieldLabel>
          <Input
            id="location"
            name="location"
            type="text"
            defaultValue={defaultLocation ?? ""}
            maxLength={80}
            placeholder="Paris, France"
          />
        </Field>
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <p className="text-xs text-muted flex-1">
          <Sparkles
            className="inline w-3.5 h-3.5 mr-1 text-gold-deep -mt-0.5"
            aria-hidden
          />
          Ton annonce sera visible immédiatement après publication.
        </p>
        <Button
          type="submit"
          loading={pending}
          size="lg"
          disabled={photos.length === 0}
        >
          {!pending ? <Save className="w-4 h-4" aria-hidden /> : null}
          {pending ? "Publication..." : "Publier l'annonce"}
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
