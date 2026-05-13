"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type SwitchProps = {
  name: string;
  defaultChecked?: boolean;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Icône Lucide optionnelle affichée avant le label (recommandé vs emoji). */
  icon?: ReactNode;
};

export function Switch({
  name,
  defaultChecked = false,
  label,
  description,
  disabled,
  icon,
}: SwitchProps) {
  const [checked, setChecked] = useState<boolean>(defaultChecked);
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start justify-between gap-4 cursor-pointer p-4 rounded-2xl border border-line bg-white hover:border-night/30 transition-colors",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      <div className="min-w-0 flex-1 flex items-start gap-2">
        {icon ? (
          <span
            aria-hidden
            className="shrink-0 mt-0.5 inline-flex w-5 h-5 items-center justify-center text-night-dim"
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-night">{label}</p>
          {description ? (
            <p className="text-xs text-muted mt-0.5 leading-snug">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200",
          checked ? "bg-night" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked && "translate-x-5",
          )}
        />
      </span>
      <input
        id={id}
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(event) => setChecked(event.currentTarget.checked)}
        disabled={disabled}
        className="sr-only"
      />
    </label>
  );
}
