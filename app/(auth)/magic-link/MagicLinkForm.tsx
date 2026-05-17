"use client";

import { ArrowRight, Mail, MailCheck } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { sendMagicLink, type MagicLinkState } from "./actions";

const INITIAL: MagicLinkState = { status: "idle" };

export function MagicLinkForm() {
  const [state, formAction, pending] = useActionState<MagicLinkState, FormData>(
    sendMagicLink,
    INITIAL,
  );

  if (state.status === "sent") {
    return (
      <div className="space-y-4">
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
          <div className="flex items-start gap-3">
            <MailCheck className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" aria-hidden />
            <div className="text-sm text-emerald-900">
              <p className="font-semibold">Lien envoyé !</p>
              <p className="mt-1 text-emerald-900/80">
                Si un compte existe pour <span className="font-medium">{state.email}</span>, tu
                vas recevoir un lien de connexion d&apos;ici quelques secondes.
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted text-center">
          Pense à vérifier tes spams. Le lien expire dans 1 heure.
        </p>
      </div>
    );
  }

  const hasError = state.status === "error";

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
          On t&apos;envoie un lien de connexion sécurisé sans mot de passe.
        </FieldHint>
        <FieldError>{hasError ? state.message : undefined}</FieldError>
      </Field>

      <Button type="submit" loading={pending} size="lg" className="w-full">
        {pending ? (
          "Envoi..."
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
