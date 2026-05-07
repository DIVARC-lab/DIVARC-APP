"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils/cn";

type SwitchProps = {
  name: string;
  defaultChecked?: boolean;
  label: string;
  description?: string;
  disabled?: boolean;
};

export function Switch({
  name,
  defaultChecked = false,
  label,
  description,
  disabled,
}: SwitchProps) {
  const [checked, setChecked] = useState(defaultChecked);
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start justify-between gap-4 cursor-pointer p-4 rounded-2xl border border-line bg-white hover:border-night/30 transition-colors",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-night">{label}</p>
        {description ? (
          <p className="text-xs text-muted mt-0.5 leading-snug">
            {description}
          </p>
        ) : null}
      </div>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200"
        style={{ backgroundColor: checked ? "#0A1F44" : "#d2d7e2" }}
      >
        <span
          aria-hidden
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
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={(e) => setChecked(e.currentTarget.checked)}
        disabled={disabled}
        className="sr-only"
      />
    </label>
  );
}
