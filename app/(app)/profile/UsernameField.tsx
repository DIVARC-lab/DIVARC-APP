"use client";

import { Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { usernameSchema } from "@/lib/validations/profile";

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "taken" }
  | { kind: "invalid"; message: string };

type UsernameFieldProps = {
  initialValue: string;
  serverError?: string;
};

export function UsernameField({
  initialValue,
  serverError,
}: UsernameFieldProps) {
  const [value, setValue] = useState(initialValue);
  const debounced = useDebouncedValue(value.trim().toLowerCase(), 350);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    if (!debounced || debounced === initialValue) {
      setStatus({ kind: "idle" });
      return;
    }

    const parsed = usernameSchema.safeParse(debounced);
    if (!parsed.success) {
      setStatus({
        kind: "invalid",
        message: parsed.error.issues[0]?.message ?? "Pseudo invalide.",
      });
      return;
    }

    setStatus({ kind: "checking" });
    const controller = new AbortController();

    fetch(
      `/api/profile/check-username?username=${encodeURIComponent(debounced)}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then((res) => res.json())
      .then(
        (data: {
          available?: boolean;
          reason?: string;
          message?: string;
        }) => {
          if (controller.signal.aborted) return;
          if (data.reason === "invalid") {
            setStatus({
              kind: "invalid",
              message: data.message ?? "Pseudo invalide.",
            });
          } else if (data.available) {
            setStatus({ kind: "available" });
          } else {
            setStatus({ kind: "taken" });
          }
        },
      )
      .catch(() => {
        if (!controller.signal.aborted) {
          setStatus({ kind: "idle" });
        }
      });

    return () => controller.abort();
  }, [debounced, initialValue]);

  const showError =
    serverError ??
    (status.kind === "taken"
      ? "Ce pseudo est déjà pris."
      : status.kind === "invalid"
        ? status.message
        : undefined);

  const isInvalid = Boolean(showError);

  return (
    <Field>
      <FieldLabel htmlFor="username" required>
        Pseudo
      </FieldLabel>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted pointer-events-none">
          @
        </span>
        <Input
          id="username"
          name="username"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={20}
          placeholder="divann_arcel"
          required
          invalid={isInvalid}
          className="pl-8 pr-12"
          aria-describedby="username-hint username-status"
        />
        <span
          id="username-status"
          aria-live="polite"
          className="absolute inset-y-0 right-0 pr-4 flex items-center"
        >
          {status.kind === "checking" ? (
            <Loader2
              className="w-4 h-4 text-muted animate-spin"
              aria-label="Vérification du pseudo"
            />
          ) : status.kind === "available" ? (
            <Check
              className="w-4 h-4 text-emerald-600"
              aria-label="Pseudo disponible"
            />
          ) : status.kind === "taken" || status.kind === "invalid" ? (
            <X
              className="w-4 h-4 text-red-500"
              aria-label="Pseudo non disponible"
            />
          ) : null}
        </span>
      </div>
      <FieldHint id="username-hint">
        3 à 20 caractères. Lettres minuscules, chiffres et _ uniquement.
      </FieldHint>
      <FieldError>{showError}</FieldError>
    </Field>
  );
}
