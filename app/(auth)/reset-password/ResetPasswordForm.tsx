"use client";

import { ArrowRight, Lock } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
} from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { updatePassword } from "./actions";

type State = { error?: string } | undefined;

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<State, FormData>(
    updatePassword,
    undefined,
  );
  const hasError = Boolean(state?.error);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <Field>
        <FieldLabel htmlFor="password" required>
          Nouveau mot de passe
        </FieldLabel>
        <div className="relative">
          <Lock
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            aria-hidden
          />
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="8 caractères minimum"
            className="pl-11"
            invalid={hasError}
          />
        </div>
        <FieldHint>Au moins 8 caractères. Mélange lettres et chiffres.</FieldHint>
      </Field>

      <Field>
        <FieldLabel htmlFor="confirm" required>
          Confirme le mot de passe
        </FieldLabel>
        <div className="relative">
          <Lock
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            aria-hidden
          />
          <Input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Re-saisis ton mot de passe"
            className="pl-11"
            invalid={hasError}
          />
        </div>
        <FieldError>{state?.error}</FieldError>
      </Field>

      <Button type="submit" loading={pending} size="lg" className="w-full">
        {pending ? (
          "Mise à jour..."
        ) : (
          <>
            Mettre à jour mon mot de passe
            <ArrowRight className="w-4 h-4" aria-hidden />
          </>
        )}
      </Button>
    </form>
  );
}
