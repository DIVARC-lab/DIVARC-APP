"use client";

import {
  AtSign,
  Building2,
  CheckCircle2,
  ClipboardList,
  GripVertical,
  Hash,
  Mail,
  MapPin,
  Phone,
  Plus,
  Shield,
  Trash2,
  Type,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import type {
  LeadFormDraft,
  LeadFormField,
  LeadFormFieldType,
} from "./types";

/* LeadFormBuilder — formulaire natif (lead_gen) attaché au creative.
 *
 * Structure :
 *   - Intro (headline + description + image optionnelle)
 *   - Champs : email/firstname/lastname/phone/company/city/postal +
 *     custom text/select (RGPD : minimisation, pas de catégorie sensible)
 *   - Privacy notice obligatoire (URL → politique de confidentialité)
 *   - Thank-you screen (headline + description + CTA optionnel)
 *
 * Stocké dans ads_lead_forms via /api/ads/lead-forms/create après
 * submit, l'ID est attaché au creative.
 */

export const DEFAULT_LEAD_FORM: LeadFormDraft = {
  name: "",
  intro_headline: "",
  intro_description: "",
  fields: [
    { type: "email", label: "Email", required: true },
    { type: "first_name", label: "Prénom", required: true },
  ],
  privacy_policy_url: "",
  thank_you_headline: "Merci !",
  thank_you_description: "On revient vers toi très vite.",
  thank_you_cta_label: "",
  thank_you_cta_url: "",
};

const FIELD_TYPES: Array<{
  type: LeadFormFieldType;
  label: string;
  defaultLabel: string;
  icon: typeof Mail;
}> = [
  { type: "email", label: "Email", defaultLabel: "Email", icon: Mail },
  { type: "first_name", label: "Prénom", defaultLabel: "Prénom", icon: User },
  {
    type: "last_name",
    label: "Nom",
    defaultLabel: "Nom",
    icon: User,
  },
  { type: "phone", label: "Téléphone", defaultLabel: "Téléphone", icon: Phone },
  {
    type: "company",
    label: "Entreprise",
    defaultLabel: "Entreprise",
    icon: Building2,
  },
  { type: "city", label: "Ville", defaultLabel: "Ville", icon: MapPin },
  {
    type: "postal_code",
    label: "Code postal",
    defaultLabel: "Code postal",
    icon: Hash,
  },
  {
    type: "custom_text",
    label: "Question texte",
    defaultLabel: "Votre question",
    icon: Type,
  },
  {
    type: "custom_select",
    label: "Choix multiple",
    defaultLabel: "Sélection",
    icon: ClipboardList,
  },
];

type Props = {
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  draft: LeadFormDraft | null;
  onDraftChange: (next: LeadFormDraft) => void;
};

export function LeadFormBuilder({
  enabled,
  onEnabledChange,
  draft,
  onDraftChange,
}: Props) {
  const value = draft ?? DEFAULT_LEAD_FORM;
  const [showFieldPicker, setShowFieldPicker] = useState(false);

  const update = (patch: Partial<LeadFormDraft>) =>
    onDraftChange({ ...value, ...patch });

  const addField = (type: LeadFormFieldType) => {
    const tplt = FIELD_TYPES.find((t) => t.type === type);
    if (!tplt || value.fields.length >= 15) return;
    const isDuplicate =
      type !== "custom_text" &&
      type !== "custom_select" &&
      value.fields.some((f) => f.type === type);
    if (isDuplicate) return;
    update({
      fields: [
        ...value.fields,
        {
          type,
          label: tplt.defaultLabel,
          required: type === "email" || type === "phone",
          options: type === "custom_select" ? ["Option 1", "Option 2"] : undefined,
        },
      ],
    });
    setShowFieldPicker(false);
  };

  const removeField = (idx: number) =>
    update({ fields: value.fields.filter((_, i) => i !== idx) });

  const updateField = (idx: number, patch: Partial<LeadFormField>) =>
    update({
      fields: value.fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    });

  const moveField = (from: number, to: number) => {
    if (to < 0 || to >= value.fields.length) return;
    const next = [...value.fields];
    const [item] = next.splice(from, 1);
    if (item) next.splice(to, 0, item);
    update({ fields: next });
  };

  return (
    <div className="rounded-2xl bg-white border border-line overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <span
          aria-hidden
          className="w-9 h-9 rounded-lg bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
        >
          <ClipboardList className="w-[16px] h-[16px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-[13.5px] font-bold text-night">
            Lead Form natif
          </span>
          <p className="text-[11.5px] text-night-muted leading-snug mt-0.5">
            Capte les leads sans quitter DIVARC. Pré-remplissage auto
            depuis le profil utilisateur (email, prénom, etc.).
          </p>
        </div>
        <Toggle
          checked={enabled}
          onChange={onEnabledChange}
          label="Activer Lead Form"
        />
      </div>

      {enabled ? (
        <div className="px-4 pb-4 pt-1 border-t border-line space-y-4">
          {/* Form name. */}
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-1">
              Nom interne du formulaire
            </label>
            <input
              type="text"
              value={value.name}
              onChange={(e) => update({ name: e.target.value })}
              maxLength={100}
              placeholder="ex: Lead form printemps 2026"
              className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[13px]"
            />
          </div>

          {/* Intro. */}
          <Section title="Écran d'intro">
            <input
              type="text"
              value={value.intro_headline}
              onChange={(e) => update({ intro_headline: e.target.value })}
              maxLength={120}
              placeholder="Titre intro (ex: Reçois nos meilleures offres)"
              className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[13px]"
            />
            <textarea
              rows={2}
              value={value.intro_description}
              onChange={(e) => update({ intro_description: e.target.value })}
              maxLength={500}
              placeholder="Description (optionnelle)"
              className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[12.5px]"
            />
          </Section>

          {/* Fields. */}
          <Section
            title={`Champs (${value.fields.length}/15)`}
            helper="L'ordre des champs reflète l'affichage. RGPD : ne demande que ce qui est strictement nécessaire."
          >
            <ul className="space-y-1.5">
              {value.fields.map((f, idx) => (
                <FieldRow
                  key={`${f.type}-${idx}`}
                  field={f}
                  onUpdate={(patch) => updateField(idx, patch)}
                  onRemove={() => removeField(idx)}
                  onMoveUp={() => moveField(idx, idx - 1)}
                  onMoveDown={() => moveField(idx, idx + 1)}
                  isFirst={idx === 0}
                  isLast={idx === value.fields.length - 1}
                />
              ))}
            </ul>
            {showFieldPicker ? (
              <div className="rounded-xl bg-bg-soft border border-line p-3 mt-2">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-night-muted">
                    Choisis un type
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowFieldPicker(false)}
                    className="text-night-muted hover:text-night"
                    aria-label="Fermer"
                  >
                    <X className="w-[12px] h-[12px]" aria-hidden />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {FIELD_TYPES.map((t) => {
                    const Icon = t.icon;
                    const exists =
                      t.type !== "custom_text" &&
                      t.type !== "custom_select" &&
                      value.fields.some((f) => f.type === t.type);
                    return (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => addField(t.type)}
                        disabled={exists}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white border border-line hover:border-night/30 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Icon
                          className="w-[14px] h-[14px] text-gold-deep"
                          aria-hidden
                        />
                        <span className="text-[10.5px] font-semibold text-night text-center">
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : value.fields.length < 15 ? (
              <button
                type="button"
                onClick={() => setShowFieldPicker(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 mt-2 rounded-xl border-2 border-dashed border-line text-[11.5px] font-bold text-night-muted hover:bg-bg-soft hover:border-night/30"
              >
                <Plus className="w-[12px] h-[12px]" aria-hidden />
                Ajouter un champ
              </button>
            ) : null}
          </Section>

          {/* Privacy. */}
          <Section
            title="Confidentialité (obligatoire RGPD)"
            helper="Lien vers ta politique de confidentialité publique. Sans ça, le formulaire sera bloqué à la review."
          >
            <div className="flex items-start gap-2">
              <Shield
                className="w-[14px] h-[14px] text-gold-deep mt-2.5 shrink-0"
                aria-hidden
              />
              <input
                type="url"
                value={value.privacy_policy_url}
                onChange={(e) =>
                  update({ privacy_policy_url: e.target.value })
                }
                placeholder="https://monsite.com/privacy"
                className="flex-1 px-3 py-2 rounded-lg border border-line bg-white text-[12.5px] font-mono"
              />
            </div>
          </Section>

          {/* Thank-you. */}
          <Section title="Écran de remerciement">
            <input
              type="text"
              value={value.thank_you_headline}
              onChange={(e) => update({ thank_you_headline: e.target.value })}
              maxLength={120}
              placeholder="Titre (ex: Merci !)"
              className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[13px]"
            />
            <textarea
              rows={2}
              value={value.thank_you_description}
              onChange={(e) =>
                update({ thank_you_description: e.target.value })
              }
              maxLength={500}
              placeholder="Description (ex: On revient vite vers toi)"
              className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[12.5px]"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={value.thank_you_cta_label}
                onChange={(e) =>
                  update({ thank_you_cta_label: e.target.value })
                }
                maxLength={40}
                placeholder="Label CTA (optionnel)"
                className="px-3 py-2 rounded-lg border border-line bg-white text-[12.5px]"
              />
              <input
                type="url"
                value={value.thank_you_cta_url}
                onChange={(e) => update({ thank_you_cta_url: e.target.value })}
                placeholder="URL CTA"
                className="px-3 py-2 rounded-lg border border-line bg-white text-[12.5px]"
              />
            </div>
          </Section>
        </div>
      ) : null}
    </div>
  );
}

function FieldRow({
  field,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  field: LeadFormField;
  onUpdate: (patch: Partial<LeadFormField>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const tpl = FIELD_TYPES.find((t) => t.type === field.type);
  const Icon = tpl?.icon ?? AtSign;
  return (
    <li className="rounded-xl bg-white border border-line p-2.5 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="text-night-muted hover:text-night disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Monter"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="text-night-muted hover:text-night disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Descendre"
          >
            ▼
          </button>
        </div>
        <Icon className="w-[14px] h-[14px] text-gold-deep shrink-0" aria-hidden />
        <input
          type="text"
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          maxLength={80}
          className="flex-1 px-2 py-1 rounded-md border border-line bg-white text-[12.5px]"
        />
        <label className="inline-flex items-center gap-1 text-[10.5px] text-night-muted cursor-pointer">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="accent-night"
          />
          Requis
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="text-night-muted hover:text-red-600"
          aria-label="Retirer"
        >
          <Trash2 className="w-[12px] h-[12px]" aria-hidden />
        </button>
      </div>
      {field.type === "custom_select" ? (
        <textarea
          rows={2}
          value={(field.options ?? []).join("\n")}
          onChange={(e) =>
            onUpdate({
              options: e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 20),
            })
          }
          placeholder="Une option par ligne"
          className="w-full px-2 py-1 rounded-md border border-line bg-white text-[11.5px] font-mono"
        />
      ) : null}
    </li>
  );
}

function Section({
  title,
  helper,
  children,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-night-muted">
        {title}
      </p>
      <div className="space-y-1.5">{children}</div>
      {helper ? (
        <p className="text-[10px] text-night-muted leading-snug">{helper}</p>
      ) : null}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
        checked ? "bg-night" : "bg-line"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-cream transition-transform ${
          checked ? "translate-x-4" : ""
        }`}
        aria-hidden
      />
    </button>
  );
}
