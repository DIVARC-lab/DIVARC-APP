"use client";

import { useId } from "react";
import type { Field } from "@/lib/marketplace/attributes-schemas";
import { cn } from "@/lib/utils/cn";

type Props = {
  field: Field;
  value: unknown;
  onChange: (next: unknown) => void;
  error?: string;
  required?: boolean;
};

/* Chantier 4 — Rendu d'un champ d'attribut dynamique. Couvre les 8 types
 * définis dans attributes-schemas.ts : select / multi_select / autocomplete
 * / number / boolean / date / text / rich_text. */
export function DynamicAttributeField({
  field,
  value,
  onChange,
  error,
  required,
}: Props) {
  const id = useId();
  const invalid = !!error;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={field.type === "boolean" ? undefined : id}
        className="block text-[12px] font-bold text-night"
      >
        {field.label}
        {required ? (
          <span className="text-red-500 ml-0.5" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {renderControl({ id, field, value, onChange, invalid })}
      {field.hint && !error ? (
        <p className="text-[11px] text-night-dim">{field.hint}</p>
      ) : null}
      {error ? (
        <p className="text-[11px] font-semibold text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

function renderControl({
  id,
  field,
  value,
  onChange,
  invalid,
}: {
  id: string;
  field: Field;
  value: unknown;
  onChange: (next: unknown) => void;
  invalid: boolean;
}) {
  switch (field.type) {
    case "select":
      return (
        <select
          id={id}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || null)}
          aria-invalid={invalid || undefined}
          className={controlClass(invalid)}
        >
          <option value="">— Choisir —</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    case "multi_select": {
      const selected: string[] = Array.isArray(value)
        ? (value as string[])
        : [];
      const isFull =
        typeof field.max === "number" && selected.length >= field.max;
      return (
        <div className="flex flex-wrap gap-1.5">
          {field.options.map((opt) => {
            const active = selected.includes(opt.value);
            const disabled = !active && isFull;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => {
                  const next = active
                    ? selected.filter((v) => v !== opt.value)
                    : [...selected, opt.value];
                  onChange(next);
                }}
                className={cn(
                  "h-8 px-3 rounded-2xl text-[12px] transition-colors",
                  active
                    ? "bg-night text-cream font-bold"
                    : "bg-white text-night-dim border border-line font-medium hover:border-night/30",
                  disabled && "opacity-40 cursor-not-allowed",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }

    case "autocomplete": {
      const listId = `${id}-list`;
      return (
        <>
          <input
            id={id}
            type="text"
            list={listId}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value || null)}
            aria-invalid={invalid || undefined}
            className={controlClass(invalid)}
            placeholder={field.allow_custom ? "Saisis ou choisis" : "Choisis"}
          />
          <datalist id={listId}>
            {field.suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </>
      );
    }

    case "number": {
      const num =
        typeof value === "number"
          ? value
          : typeof value === "string" && value !== ""
            ? Number(value)
            : "";
      return (
        <div className="flex items-stretch">
          <input
            id={id}
            type="number"
            inputMode={field.integer ? "numeric" : "decimal"}
            min={field.min}
            max={field.max}
            step={field.step ?? (field.integer ? 1 : "any")}
            value={typeof num === "number" && Number.isFinite(num) ? num : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") onChange(null);
              else {
                const n = field.integer ? parseInt(v, 10) : Number(v);
                onChange(Number.isFinite(n) ? n : null);
              }
            }}
            aria-invalid={invalid || undefined}
            className={cn(
              controlClass(invalid),
              field.unit && "rounded-r-none border-r-0",
            )}
          />
          {field.unit ? (
            <span className="inline-flex items-center px-3 rounded-r-xl bg-bg-soft border border-l-0 border-line text-[12px] text-night-dim font-semibold">
              {field.unit}
            </span>
          ) : null}
        </div>
      );
    }

    case "boolean": {
      const checked = !!value;
      return (
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={cn(
            "inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border transition-colors text-[13px] font-semibold",
            checked
              ? "bg-night text-cream border-night"
              : "bg-white text-night border-line hover:border-night/30",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "inline-block w-3 h-3 rounded-full",
              checked ? "bg-gold" : "bg-line",
            )}
          />
          {checked ? "Oui" : "Non"}
        </button>
      );
    }

    case "date":
      return (
        <input
          id={id}
          type="date"
          value={typeof value === "string" ? value : ""}
          min={
            typeof field.min_year === "number"
              ? `${field.min_year}-01-01`
              : undefined
          }
          max={
            typeof field.max_year === "number"
              ? `${field.max_year}-12-31`
              : undefined
          }
          onChange={(e) => onChange(e.target.value || null)}
          aria-invalid={invalid || undefined}
          className={controlClass(invalid)}
        />
      );

    case "text":
      return (
        <input
          id={id}
          type="text"
          value={typeof value === "string" ? value : ""}
          maxLength={field.max_length}
          onChange={(e) => onChange(e.target.value || null)}
          aria-invalid={invalid || undefined}
          className={controlClass(invalid)}
        />
      );

    case "rich_text":
      return (
        <textarea
          id={id}
          rows={4}
          value={typeof value === "string" ? value : ""}
          maxLength={field.max_length}
          onChange={(e) => onChange(e.target.value || null)}
          aria-invalid={invalid || undefined}
          className={cn(
            controlClass(invalid),
            "h-auto min-h-[88px] py-2.5 resize-y",
          )}
        />
      );

    default: {
      const _exhaustive: never = field;
      void _exhaustive;
      return null;
    }
  }
}

function controlClass(invalid: boolean) {
  return cn(
    "h-10 w-full rounded-xl border bg-white px-3 text-[13px] text-night placeholder:text-night-dim",
    "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-bg",
    invalid
      ? "border-red-500/60 focus:ring-red-500/30 focus:border-red-500"
      : "border-line focus:border-night focus:ring-night/15",
  );
}
