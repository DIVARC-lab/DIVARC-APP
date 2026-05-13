"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Loader2,
  Save,
} from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CURRENCY_LABELS } from "@/lib/database.types";
import { CONDITION_META } from "@/lib/utils/categories";
import {
  getAttributeSchema,
  type Field,
} from "@/lib/marketplace/attributes-schemas";
import {
  getCategoryById,
  getDirectChildren,
  listTopCategories,
} from "@/lib/marketplace/taxonomy";
import { cn } from "@/lib/utils/cn";
import {
  createListingV2,
  type ListingV2FormState,
} from "../actions";
import { PhotoUploader, type UploadedPhoto } from "./PhotoUploader";
import { DynamicAttributeField } from "./_steps/DynamicAttributeField";

const INITIAL: ListingV2FormState = { status: "idle" };

type Props = {
  userId: string;
  defaultLocation: string | null;
  defaultCurrency: string;
  /* Chantier 3.3 — annonce rattachée à un cercle (pré-rempli depuis ?circle=). */
  circleId?: string | null;
};

type WizardState = {
  photos: UploadedPhoto[];
  categoryPath: string[];
  title: string;
  description: string;
  condition: string;
  attributes: Record<string, unknown>;
  priceAmount: string;
  priceCurrency: string;
  isNegotiable: boolean;
  location: string;
};

const CONDITION_OPTIONS = [
  "new_with_tags",
  "new_without_tags",
  "very_good",
  "good",
  "satisfactory",
  "damaged",
] as const;

const STEPS = [
  { key: "photos", label: "Photos" },
  { key: "category", label: "Catégorie" },
  { key: "basics", label: "Détails" },
  { key: "attributes", label: "Caractéristiques" },
  { key: "pricing", label: "Prix" },
  { key: "review", label: "Récap" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

export function CreateListingWizard({
  userId,
  defaultLocation,
  defaultCurrency,
  circleId = null,
}: Props) {
  const [state, formAction, pending] = useActionState<
    ListingV2FormState,
    FormData
  >(createListingV2, INITIAL);

  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<WizardState>({
    photos: [],
    categoryPath: [],
    title: "",
    description: "",
    condition: "good",
    attributes: {},
    priceAmount: "",
    priceCurrency: defaultCurrency,
    isNegotiable: false,
    location: defaultLocation ?? "",
  });

  const currentStep: StepKey = STEPS[stepIndex]!.key;

  const leafCategoryId =
    data.categoryPath.length > 0
      ? data.categoryPath[data.categoryPath.length - 1]!
      : null;
  const attributeSchema = useMemo(
    () => (leafCategoryId ? getAttributeSchema(leafCategoryId) : null),
    [leafCategoryId],
  );

  /* Si la catégorie n'a pas de schéma d'attributs défini, on saute l'étape. */
  const stepIsApplicable = (key: StepKey): boolean => {
    if (key === "attributes") return !!attributeSchema;
    return true;
  };

  useEffect(() => {
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  function gotoNext() {
    let next = stepIndex + 1;
    while (next < STEPS.length && !stepIsApplicable(STEPS[next]!.key)) next++;
    setStepIndex(Math.min(next, STEPS.length - 1));
  }
  function gotoPrev() {
    let prev = stepIndex - 1;
    while (prev >= 0 && !stepIsApplicable(STEPS[prev]!.key)) prev--;
    setStepIndex(Math.max(prev, 0));
  }

  /* Validation par étape (gating "Suivant"). */
  function canAdvance(): boolean {
    switch (currentStep) {
      case "photos":
        return data.photos.length > 0;
      case "category":
        return data.categoryPath.length > 0;
      case "basics":
        return data.title.trim().length >= 3 && data.condition !== "";
      case "attributes": {
        if (!attributeSchema) return true;
        return attributeSchema.required.every((f) => {
          const v = data.attributes[f.key];
          if (f.type === "multi_select") return Array.isArray(v) && v.length > 0;
          return v !== null && v !== undefined && v !== "";
        });
      }
      case "pricing": {
        const n = Number(data.priceAmount);
        return Number.isFinite(n) && n >= 0;
      }
      case "review":
        return false;
      default:
        return false;
    }
  }

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <ol className="flex items-center gap-1.5">
        {STEPS.map((s, i) => {
          const skipped = !stepIsApplicable(s.key);
          const active = i === stepIndex;
          const done = i < stepIndex && !skipped;
          return (
            <li
              key={s.key}
              className={cn(
                "flex-1 h-1.5 rounded-full transition-colors",
                done
                  ? "bg-gold"
                  : active
                    ? "bg-night"
                    : skipped
                      ? "bg-line/50"
                      : "bg-line",
              )}
              aria-current={active ? "step" : undefined}
              aria-label={`Étape ${i + 1} : ${s.label}`}
            />
          );
        })}
      </ol>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
        · Étape {stepIndex + 1} / {STEPS.length} — {STEPS[stepIndex]!.label}
      </p>

      {/* Step content */}
      <div className="rounded-3xl bg-white border border-line p-5 sm:p-7">
        {currentStep === "photos" ? (
          <StepPhotos
            userId={userId}
            photos={data.photos}
            onChange={(photos) => setData((d) => ({ ...d, photos }))}
          />
        ) : null}

        {currentStep === "category" ? (
          <StepCategory
            path={data.categoryPath}
            onChange={(categoryPath) =>
              setData((d) => ({ ...d, categoryPath, attributes: {} }))
            }
          />
        ) : null}

        {currentStep === "basics" ? (
          <StepBasics
            title={data.title}
            description={data.description}
            condition={data.condition}
            onChange={(patch) => setData((d) => ({ ...d, ...patch }))}
          />
        ) : null}

        {currentStep === "attributes" && attributeSchema ? (
          <StepAttributes
            schema={attributeSchema}
            values={data.attributes}
            errors={state.attributeErrors}
            onChange={(attributes) => setData((d) => ({ ...d, attributes }))}
          />
        ) : null}

        {currentStep === "pricing" ? (
          <StepPricing
            priceAmount={data.priceAmount}
            priceCurrency={data.priceCurrency}
            isNegotiable={data.isNegotiable}
            location={data.location}
            onChange={(patch) => setData((d) => ({ ...d, ...patch }))}
          />
        ) : null}

        {currentStep === "review" ? (
          <StepReview data={data} attributeSchema={attributeSchema} />
        ) : null}
      </div>

      {/* Footer nav */}
      {currentStep === "review" ? (
        <form action={formAction}>
          {/* Submission : on sérialise tout l'état du wizard en FormData. */}
          {circleId ? (
            <input type="hidden" name="circle_id" value={circleId} />
          ) : null}
          <input
            type="hidden"
            name="photos"
            value={JSON.stringify(
              data.photos.map((p) => ({ url: p.url, position: p.position })),
            )}
          />
          <input
            type="hidden"
            name="category_path"
            value={JSON.stringify(data.categoryPath)}
          />
          <input
            type="hidden"
            name="attributes"
            value={JSON.stringify(data.attributes)}
          />
          <input type="hidden" name="title" value={data.title} />
          <input
            type="hidden"
            name="description"
            value={data.description}
          />
          <input type="hidden" name="condition" value={data.condition} />
          <input
            type="hidden"
            name="price_amount"
            value={data.priceAmount}
          />
          <input
            type="hidden"
            name="price_currency"
            value={data.priceCurrency}
          />
          {data.isNegotiable ? (
            <input type="hidden" name="is_negotiable" value="on" />
          ) : null}
          <input type="hidden" name="location" value={data.location} />

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={gotoPrev}
              disabled={pending}
              className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-white border border-line text-night text-[13px] font-bold hover:border-night/30 transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden />
              Modifier
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-gradient-to-br from-gold to-gold-deep text-night text-[13px] font-extrabold shadow-[0_8px_22px_-8px_rgba(244,185,66,0.55)] hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              ) : (
                <Save className="w-4 h-4" aria-hidden />
              )}
              {pending ? "Publication…" : "Publier l'annonce"}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={gotoPrev}
            disabled={stepIndex === 0}
            className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-white border border-line text-night text-[13px] font-bold hover:border-night/30 transition-colors disabled:opacity-30 disabled:hover:border-line"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Retour
          </button>
          <button
            type="button"
            onClick={gotoNext}
            disabled={!canAdvance()}
            className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-night text-cream text-[13px] font-bold hover:bg-night-soft transition-colors disabled:opacity-40 disabled:hover:bg-night"
          >
            Continuer
            <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * Étape 1 — Photos
 * ============================================================================ */

function StepPhotos({
  userId,
  photos,
  onChange,
}: {
  userId: string;
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-[22px] text-night italic mb-1">
        Tes photos
      </h2>
      <p className="text-[12px] text-night-dim mb-4">
        Une vraie photo, lumière du jour. Mets-en plusieurs sous différents angles.
      </p>
      <PhotoUploader userId={userId} initial={photos} onChange={onChange} />
    </div>
  );
}

/* ============================================================================
 * Étape 2 — Catégorie (drill-down dans la taxonomy)
 * ============================================================================ */

function StepCategory({
  path,
  onChange,
}: {
  path: string[];
  onChange: (path: string[]) => void;
}) {
  /* À chaque niveau, on affiche les enfants du dernier élément du path
   * (ou les top-categories si path vide). */
  const tops = listTopCategories();
  const currentChildren =
    path.length === 0
      ? tops.map((t) => ({ id: t.id, label: t.label }))
      : getDirectChildren(path[path.length - 1]!).map((c) => ({
          id: c.id,
          label: c.label,
        }));

  const isLeaf = path.length > 0 && currentChildren.length === 0;

  return (
    <div>
      <h2 className="font-display text-[22px] text-night italic mb-1">
        Catégorie
      </h2>
      <p className="text-[12px] text-night-dim mb-4">
        Précise au maximum pour que ton annonce soit visible des bons acheteurs.
      </p>

      {/* Breadcrumb */}
      {path.length > 0 ? (
        <div className="flex items-center gap-1 flex-wrap mb-4">
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[12px] font-bold text-night-dim hover:text-night"
          >
            Toutes
          </button>
          {path.map((id, i) => {
            const node = getCategoryById(id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 text-[12px]"
              >
                <ChevronRight
                  className="w-3 h-3 text-night-dim/60"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => onChange(path.slice(0, i + 1))}
                  className="font-bold text-night hover:underline"
                >
                  {node?.label ?? id}
                </button>
              </span>
            );
          })}
        </div>
      ) : null}

      {!isLeaf ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {currentChildren.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange([...path, c.id])}
              className="inline-flex items-center justify-between gap-2 h-12 px-3.5 rounded-xl bg-bg-soft border border-line text-night text-[13px] font-semibold hover:border-night/30 hover:bg-white transition-colors text-left"
            >
              <span className="truncate">{c.label}</span>
              <ChevronRight
                className="w-4 h-4 text-night-dim shrink-0"
                aria-hidden
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-bg-soft border border-line p-4 flex items-center gap-3">
          <span
            aria-hidden
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gold text-night"
          >
            <Check className="w-4 h-4" />
          </span>
          <div>
            <p className="text-[13px] font-bold text-night">
              {getCategoryById(path[path.length - 1]!)?.label}
            </p>
            <p className="text-[11px] text-night-dim mt-0.5">
              Catégorie sélectionnée
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * Étape 3 — Basics (titre, description, état)
 * ============================================================================ */

function StepBasics({
  title,
  description,
  condition,
  onChange,
}: {
  title: string;
  description: string;
  condition: string;
  onChange: (
    patch: Partial<Pick<WizardState, "title" | "description" | "condition">>,
  ) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-[22px] text-night italic mb-1">
        Détails
      </h2>
      <p className="text-[12px] text-night-dim mb-4">
        Un titre clair et une description honnête vendent vite.
      </p>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="wz-title"
            className="block text-[12px] font-bold text-night mb-1.5"
          >
            Titre <span className="text-red-500">*</span>
          </label>
          <Input
            id="wz-title"
            type="text"
            value={title}
            onChange={(e) => onChange({ title: e.target.value })}
            minLength={3}
            maxLength={120}
            placeholder="Ex: Robe Sézane en soie taille 38"
          />
        </div>

        <div>
          <label
            htmlFor="wz-desc"
            className="block text-[12px] font-bold text-night mb-1.5"
          >
            Description
          </label>
          <Textarea
            id="wz-desc"
            value={description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={5}
            maxLength={4000}
            placeholder="État, achat, port, défauts éventuels…"
          />
        </div>

        <div>
          <p className="block text-[12px] font-bold text-night mb-1.5">
            État <span className="text-red-500">*</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CONDITION_OPTIONS.map((c) => {
              const active = condition === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ condition: c })}
                  className={cn(
                    "h-9 px-3 rounded-2xl text-[12px] transition-colors",
                    active
                      ? "bg-night text-cream font-bold"
                      : "bg-white text-night-dim border border-line font-medium hover:border-night/30",
                  )}
                >
                  {CONDITION_META[c]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * Étape 4 — Attributs dynamiques (selon schéma de la catégorie feuille)
 * ============================================================================ */

function StepAttributes({
  schema,
  values,
  errors,
  onChange,
}: {
  schema: ReturnType<typeof getAttributeSchema>;
  values: Record<string, unknown>;
  errors?: Record<string, string>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  if (!schema) return null;

  function setValue(key: string, v: unknown) {
    onChange({ ...values, [key]: v });
  }

  return (
    <div>
      <h2 className="font-display text-[22px] text-night italic mb-1">
        Caractéristiques
      </h2>
      <p className="text-[12px] text-night-dim mb-4">
        Précise pour aider les acheteurs à trouver ton annonce.
      </p>

      <div className="space-y-5">
        <FieldGroup title="Requis" fields={schema.required}>
          {(f: Field) => (
            <DynamicAttributeField
              key={f.key}
              field={f}
              value={values[f.key]}
              error={errors?.[f.key]}
              required
              onChange={(v) => setValue(f.key, v)}
            />
          )}
        </FieldGroup>

        {schema.optional.length > 0 ? (
          <FieldGroup title="Détails (optionnel)" fields={schema.optional}>
            {(f: Field) => (
              <DynamicAttributeField
                key={f.key}
                field={f}
                value={values[f.key]}
                error={errors?.[f.key]}
                onChange={(v) => setValue(f.key, v)}
              />
            )}
          </FieldGroup>
        ) : null}
      </div>
    </div>
  );
}

function FieldGroup({
  title,
  fields,
  children,
}: {
  title: string;
  fields: ReadonlyArray<Field>;
  children: (field: Field) => React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gold-deep mb-2.5">
        · {title}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => children(f))}
      </div>
    </div>
  );
}

/* ============================================================================
 * Étape 5 — Prix & Localisation
 * ============================================================================ */

function StepPricing({
  priceAmount,
  priceCurrency,
  isNegotiable,
  location,
  onChange,
}: {
  priceAmount: string;
  priceCurrency: string;
  isNegotiable: boolean;
  location: string;
  onChange: (
    patch: Partial<
      Pick<
        WizardState,
        "priceAmount" | "priceCurrency" | "isNegotiable" | "location"
      >
    >,
  ) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-[22px] text-night italic mb-1">
        Prix et lieu
      </h2>
      <p className="text-[12px] text-night-dim mb-4">
        Compare avec des annonces similaires pour vendre plus vite.
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label
              htmlFor="wz-price"
              className="block text-[12px] font-bold text-night mb-1.5"
            >
              Montant <span className="text-red-500">*</span>
            </label>
            <Input
              id="wz-price"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.01}
              value={priceAmount}
              onChange={(e) => onChange({ priceAmount: e.target.value })}
              placeholder="0"
            />
          </div>
          <div>
            <label
              htmlFor="wz-currency"
              className="block text-[12px] font-bold text-night mb-1.5"
            >
              Devise
            </label>
            <Select
              id="wz-currency"
              value={priceCurrency}
              onChange={(e) => onChange({ priceCurrency: e.target.value })}
            >
              {Object.entries(CURRENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label.split(" · ")[0] ?? label} ({value})
                </option>
              ))}
            </Select>
          </div>
        </div>

        <label className="inline-flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isNegotiable}
            onChange={(e) => onChange({ isNegotiable: e.target.checked })}
            className="w-4 h-4 rounded border-line accent-gold-deep"
          />
          <span className="text-[13px] font-semibold text-night">
            Prix négociable — les acheteurs peuvent te faire une offre
          </span>
        </label>

        <div>
          <label
            htmlFor="wz-loc"
            className="block text-[12px] font-bold text-night mb-1.5"
          >
            Ville
          </label>
          <Input
            id="wz-loc"
            type="text"
            value={location}
            onChange={(e) => onChange({ location: e.target.value })}
            maxLength={80}
            placeholder="Paris, France"
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * Étape 6 — Récap
 * ============================================================================ */

function StepReview({
  data,
  attributeSchema,
}: {
  data: WizardState;
  attributeSchema: ReturnType<typeof getAttributeSchema>;
}) {
  const breadcrumb = data.categoryPath
    .map((id) => getCategoryById(id)?.label ?? id)
    .join(" › ");

  return (
    <div>
      <h2 className="font-display text-[22px] text-night italic mb-1">
        Récap avant publication
      </h2>
      <p className="text-[12px] text-night-dim mb-4">
        Tu peux revenir en arrière pour corriger.
      </p>

      <div className="space-y-3">
        {data.photos.length > 0 ? (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
            {data.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.url}
                src={p.url}
                alt=""
                className="shrink-0 h-20 w-20 object-cover rounded-lg border border-line"
                loading="lazy"
              />
            ))}
          </div>
        ) : null}

        <ReviewRow label="Catégorie" value={breadcrumb || "—"} />
        <ReviewRow label="Titre" value={data.title || "—"} />
        {data.description ? (
          <ReviewRow label="Description" value={data.description} multiline />
        ) : null}
        <ReviewRow
          label="État"
          value={CONDITION_META[data.condition as keyof typeof CONDITION_META] ?? data.condition}
        />
        <ReviewRow
          label="Prix"
          value={`${data.priceAmount || "0"} ${data.priceCurrency}${data.isNegotiable ? " · négociable" : ""}`}
        />
        {data.location ? (
          <ReviewRow label="Lieu" value={data.location} />
        ) : null}

        {attributeSchema &&
        Object.keys(data.attributes).length > 0 ? (
          <div className="pt-2">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gold-deep mb-2">
              · Caractéristiques
            </p>
            <dl className="rounded-xl bg-bg-soft border border-line divide-y divide-line overflow-hidden">
              {[...attributeSchema.required, ...attributeSchema.optional].map(
                (f) => {
                  const v = data.attributes[f.key];
                  if (v === null || v === undefined || v === "") return null;
                  const display = Array.isArray(v) ? v.join(", ") : String(v);
                  return (
                    <div
                      key={f.key}
                      className="flex items-baseline justify-between gap-3 px-3.5 py-2"
                    >
                      <dt className="text-[12px] text-night-dim shrink-0">
                        {f.label}
                      </dt>
                      <dd className="text-[12px] text-night font-semibold text-right truncate">
                        {display}
                      </dd>
                    </div>
                  );
                },
              )}
            </dl>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-night-dim w-24 shrink-0">
        {label}
      </dt>
      <dd
        className={cn(
          "text-[13px] text-night font-semibold flex-1 min-w-0",
          multiline ? "whitespace-pre-wrap" : "truncate",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
