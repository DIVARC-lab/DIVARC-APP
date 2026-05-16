"use client";

import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
} from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { requestPasswordReset } from "./actions";

type State = { error?: string; success?: true } | undefined;

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<State, FormData>(
    requestPasswordReset,
    undefined,
  );
  const hasError = Boolean(state?.error);
  const sent = Boolean(state?.success);

  if (sent) {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center">
        <CheckCircle2
          className="w-8 h-8 text-emerald-600 mx-auto mb-2"
          aria-hidden
        />
        <p className="text-[14px] font-bold text-night">
          Email envoyé ✓
        </p>
        <p className="mt-1 text-[12.5px] text-night-dim leading-relaxed">
          Si un compte existe avec cette adresse, tu vas recevoir un lien
          pour réinitialiser ton mot de passe d&apos;ici quelques minutes.
          Vérifie aussi tes spams.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <Field>
        <FieldLabel htmlFor="email" required>
          Email
        </FieldLabel>
        <div className="relative">
          <Mail
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            aria-hidden
          />
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="toi@exemple.com"
            className="pl-11"
            invalid={hasError}
          />
        </div>
        <FieldHint>
          On t&apos;enverra un lien pour définir un nouveau mot de passe.
        </FieldHint>
        <FieldError>{state?.error}</FieldError>
      </Field>

      <Button type="submit" loading={pending} size="lg" className="w-full">
        {pending ? (
          "Envoi en cours..."
        ) : (
          <>
            Envoyer le lien
            <ArrowRight className="w-4 h-4" aria-hidden />
          </>
        )}
      </Button>
    </form>
  );
}
