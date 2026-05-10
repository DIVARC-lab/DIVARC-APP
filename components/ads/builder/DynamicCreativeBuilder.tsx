"use client";

import { Layers3, Plus, Sparkles, Trash2 } from "lucide-react";
import type { DynamicVariant } from "./types";

/* DynamicCreativeBuilder — autorise plusieurs variants (titre, body,
 * media) testés dynamiquement. L'algorithme de delivery sélectionne la
 * meilleure combo par utilisateur (cf. ads_dynamic_creative_variants).
 *
 * Best-practice : 2-5 variants par axe, pas plus pour garder du signal.
 */

type Props = {
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  variants: DynamicVariant[];
  onVariantsChange: (next: DynamicVariant[]) => void;
  /* Fields déjà saisis dans l'ad principale, pour bootstrap. */
  baseHeadline?: string;
  basePrimaryText?: string;
  baseDescription?: string;
  baseMediaUrl?: string;
};

export function DynamicCreativeBuilder({
  enabled,
  onEnabledChange,
  variants,
  onVariantsChange,
  baseHeadline,
  basePrimaryText,
  baseDescription,
  baseMediaUrl,
}: Props) {
  const addVariant = () => {
    if (variants.length >= 4) return;
    onVariantsChange([...variants, {}]);
  };

  const removeVariant = (idx: number) =>
    onVariantsChange(variants.filter((_, i) => i !== idx));

  const updateVariant = (idx: number, patch: Partial<DynamicVariant>) =>
    onVariantsChange(
      variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    );

  const bootstrapFromBase = () => {
    if (variants.length > 0) return;
    /* Crée 2 slots vides en seed. */
    onVariantsChange([{}, {}]);
  };

  return (
    <div className="rounded-2xl bg-white border border-line overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <span
          aria-hidden
          className="w-9 h-9 rounded-lg bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
        >
          <Layers3 className="w-[16px] h-[16px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[13.5px] font-bold text-night">
              Dynamic Creative
            </span>
            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              Reco
            </span>
          </div>
          <p className="text-[11.5px] text-night-muted leading-snug mt-0.5">
            Active plusieurs variants (titre, body, image) — l&apos;algo
            choisira la meilleure combinaison par utilisateur. CTR moyen
            +18 % vs créa unique.
          </p>
        </div>
        <Toggle
          checked={enabled}
          onChange={(next) => {
            onEnabledChange(next);
            if (next) bootstrapFromBase();
          }}
          label="Activer Dynamic Creative"
        />
      </div>

      {enabled ? (
        <div className="px-4 pb-4 pt-1 border-t border-line space-y-3">
          <p className="text-[11.5px] text-night-soft leading-snug">
            <Sparkles
              className="inline w-[12px] h-[12px] mr-1 text-gold-deep"
              aria-hidden
            />
            Le visuel principal et le texte saisis ci-dessus servent de
            variant n°1. Ajoute jusqu&apos;à 4 alternatives.
          </p>

          {variants.length === 0 ? (
            <button
              type="button"
              onClick={addVariant}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border-2 border-dashed border-line text-[12px] font-bold text-night-muted hover:bg-bg-soft hover:border-night/30"
            >
              <Plus className="w-[14px] h-[14px]" aria-hidden />
              Ajouter une variante
            </button>
          ) : (
            <div className="space-y-3">
              {/* Variant 1 — base, en lecture seule. */}
              <div className="rounded-xl bg-bg-soft border border-line p-3">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-night-muted">
                    Variante 1 (de base)
                  </span>
                </div>
                <ul className="text-[11.5px] text-night-soft space-y-1">
                  <li>
                    <span className="font-bold">Titre :</span>{" "}
                    {baseHeadline || "—"}
                  </li>
                  <li>
                    <span className="font-bold">Texte :</span>{" "}
                    {basePrimaryText || "—"}
                  </li>
                  {baseDescription ? (
                    <li>
                      <span className="font-bold">Desc :</span>{" "}
                      {baseDescription}
                    </li>
                  ) : null}
                  {baseMediaUrl ? (
                    <li>
                      <span className="font-bold">Visuel :</span>{" "}
                      <span className="font-mono text-[10px] truncate">
                        {baseMediaUrl.startsWith("data:")
                          ? "[base64]"
                          : baseMediaUrl}
                      </span>
                    </li>
                  ) : null}
                </ul>
              </div>

              {variants.map((v, idx) => (
                <VariantEditor
                  key={idx}
                  index={idx + 2}
                  variant={v}
                  onUpdate={(patch) => updateVariant(idx, patch)}
                  onRemove={() => removeVariant(idx)}
                />
              ))}

              {variants.length < 4 ? (
                <button
                  type="button"
                  onClick={addVariant}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border-2 border-dashed border-line text-[11.5px] font-bold text-night-muted hover:bg-bg-soft hover:border-night/30"
                >
                  <Plus className="w-[12px] h-[12px]" aria-hidden />
                  Ajouter une variante ({variants.length}/4)
                </button>
              ) : (
                <p className="text-[10.5px] text-night-muted text-center">
                  Limite atteinte (4 variants alternatives).
                </p>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function VariantEditor({
  index,
  variant,
  onUpdate,
  onRemove,
}: {
  index: number;
  variant: DynamicVariant;
  onUpdate: (patch: Partial<DynamicVariant>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl bg-white border border-line p-3 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-night-muted">
          Variante {index}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-night-muted hover:text-red-600 inline-flex items-center gap-1 text-[10.5px]"
        >
          <Trash2 className="w-[11px] h-[11px]" aria-hidden />
          Retirer
        </button>
      </div>
      <div className="space-y-2">
        <input
          type="text"
          value={variant.headline ?? ""}
          onChange={(e) => onUpdate({ headline: e.target.value })}
          maxLength={40}
          placeholder="Titre alternatif (40 max)"
          className="w-full px-3 py-1.5 rounded-lg border border-line bg-white text-[12.5px]"
        />
        <textarea
          rows={2}
          value={variant.primary_text ?? ""}
          onChange={(e) => onUpdate({ primary_text: e.target.value })}
          maxLength={125}
          placeholder="Texte principal alternatif (125 max)"
          className="w-full px-3 py-1.5 rounded-lg border border-line bg-white text-[12.5px]"
        />
        <input
          type="text"
          value={variant.description ?? ""}
          onChange={(e) => onUpdate({ description: e.target.value })}
          maxLength={30}
          placeholder="Description alternative (30 max)"
          className="w-full px-3 py-1.5 rounded-lg border border-line bg-white text-[12.5px]"
        />
        <input
          type="url"
          value={variant.media_url ?? ""}
          onChange={(e) => onUpdate({ media_url: e.target.value })}
          placeholder="URL visuel alternatif (optionnel)"
          className="w-full px-3 py-1.5 rounded-lg border border-line bg-white text-[12.5px]"
        />
      </div>
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
