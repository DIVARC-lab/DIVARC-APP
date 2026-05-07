"use client";

import { ArrowRight, Mail, Lock } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { signIn } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, undefined);
  const hasError = Boolean(state?.error);

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
      </Field>

      <Field>
        <div className="flex items-center justify-between">
          <FieldLabel htmlFor="password" required>
            Mot de passe
          </FieldLabel>
          <a
            href="#"
            className="text-xs font-medium text-night-muted hover:text-night transition-colors"
          >
            Mot de passe oublié ?
          </a>
        </div>
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
            autoComplete="current-password"
            placeholder="••••••••"
            className="pl-11"
            invalid={hasError}
          />
        </div>
        <FieldError>{state?.error}</FieldError>
      </Field>

      <Button type="submit" loading={pending} size="lg" className="w-full">
        {pending ? (
          "Connexion..."
        ) : (
          <>
            Se connecter
            <ArrowRight className="w-4 h-4" aria-hidden />
          </>
        )}
      </Button>
    </form>
  );
}
