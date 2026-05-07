"use client";

import { Eye, EyeOff, KeyRound, Shield, Smartphone, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
} from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { changePassword, type PasswordFormState } from "./actions";

const INITIAL: PasswordFormState = { status: "idle" };

type SecurityPanelProps = {
  email: string;
  lastSignInAt: string | null;
};

export function SecurityPanel({ email, lastSignInAt }: SecurityPanelProps) {
  const [state, formAction, pending] = useActionState<
    PasswordFormState,
    FormData
  >(changePassword, INITIAL);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  return (
    <div className="space-y-6">
      <section className="p-6 sm:p-8 rounded-3xl bg-white border border-line shadow-soft">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-night/5 flex items-center justify-center">
            <KeyRound className="w-4 h-4 text-night" aria-hidden />
          </div>
          <div>
            <h3 className="font-display text-xl text-night">Mot de passe</h3>
            <p className="text-sm text-muted">
              Choisis-en un long et unique.
            </p>
          </div>
        </div>

        <form action={formAction} className="space-y-4 max-w-sm">
          <Field>
            <FieldLabel htmlFor="newPassword">Nouveau mot de passe</FieldLabel>
            <div className="relative">
              <Input
                id="newPassword"
                name="newPassword"
                type={reveal ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Au moins 8 caractères"
                invalid={state.status === "error"}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                aria-label={reveal ? "Masquer" : "Afficher"}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-night/5 text-muted hover:text-night"
              >
                {reveal ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <FieldHint>Mélange lettres, chiffres et un caractère spécial.</FieldHint>
            <FieldError>
              {state.status === "error" ? state.message : undefined}
            </FieldError>
          </Field>
          <Button type="submit" loading={pending}>
            Mettre à jour
          </Button>
        </form>
      </section>

      <section className="p-6 sm:p-8 rounded-3xl bg-white border border-line shadow-soft">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-700" aria-hidden />
          </div>
          <div>
            <h3 className="font-display text-xl text-night">Authentification</h3>
            <p className="text-sm text-muted">
              Vérifie tes accès et active la double authentification.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <article className="p-4 rounded-2xl border border-line bg-night/[0.02]">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              Email
            </p>
            <p className="mt-1 text-sm font-medium text-night truncate" title={email}>
              {email}
            </p>
            <p className="mt-1 text-xs text-emerald-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Vérifié
            </p>
          </article>
          <article className="p-4 rounded-2xl border border-line bg-night/[0.02]">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              Dernière connexion
            </p>
            <p className="mt-1 text-sm font-medium text-night">
              {lastSignInAt
                ? new Date(lastSignInAt).toLocaleString("fr-FR", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })
                : "Jamais"}
            </p>
          </article>
          <article className="p-4 rounded-2xl border border-dashed border-line">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-night">2FA</p>
                <p className="text-xs text-muted">
                  Code à usage unique par appli mobile.
                </p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-md bg-gold/15 text-gold-deep">
                Bientôt
              </span>
            </div>
          </article>
          <article className="p-4 rounded-2xl border border-dashed border-line">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-night" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-night">
                    Appareils connectés
                  </p>
                  <p className="text-xs text-muted">
                    Gestion multi-appareils.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-md bg-gold/15 text-gold-deep">
                Bientôt
              </span>
            </div>
          </article>
        </div>
      </section>

      <section className="p-6 sm:p-8 rounded-3xl bg-red-50/50 border border-red-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-red-600" aria-hidden />
          </div>
          <div>
            <h3 className="font-display text-xl text-red-900">Zone sensible</h3>
            <p className="text-sm text-red-900/70">
              Action irréversible. Toute ton activité sera supprimée.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled
          aria-disabled
          className="opacity-70"
        >
          Supprimer mon compte
        </Button>
        <p className="mt-2 text-xs text-red-900/70">
          La suppression sera disponible après le lancement public.
        </p>
      </section>
    </div>
  );
}
