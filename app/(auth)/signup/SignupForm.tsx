"use client";

import { ArrowRight, AtSign, Lock, Mail, User } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
} from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { signUp } from "./actions";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, undefined);
  const hasError = Boolean(state?.error);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <Field>
        <FieldLabel htmlFor="fullName" required>
          Nom complet
        </FieldLabel>
        <div className="relative">
          <User
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            aria-hidden
          />
          <Input
            id="fullName"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            placeholder="Pepemssie Divann"
            maxLength={80}
            className="pl-11"
            invalid={hasError}
          />
        </div>
      </Field>

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
      </Field>

      <Field>
        <FieldLabel htmlFor="password" required>
          Mot de passe
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
        <FieldError>{state?.error}</FieldError>
      </Field>

      <Button type="submit" loading={pending} size="lg" className="w-full">
        {pending ? (
          "Création du compte..."
        ) : (
          <>
            <AtSign className="w-4 h-4" aria-hidden />
            Créer mon compte
            <ArrowRight className="w-4 h-4" aria-hidden />
          </>
        )}
      </Button>

      <p className="text-xs text-muted text-center pt-2">
        En créant un compte, tu acceptes nos{" "}
        <a href="#" className="underline hover:text-night">
          conditions d&apos;utilisation
        </a>{" "}
        et notre{" "}
        <a href="#" className="underline hover:text-night">
          politique de confidentialité
        </a>
        .
      </p>
    </form>
  );
}
