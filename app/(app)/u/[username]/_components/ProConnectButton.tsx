"use client";

import { Loader2, Network, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FieldHint, FieldLabel } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { runAction } from "@/lib/utils/clientAction";
import { sendProConnection } from "@/app/(app)/network/actions";

type Props = {
  targetUserId: string;
  initialState: "none" | "connected" | "pending_in" | "pending_out";
};

const CONTEXT_OPTIONS = [
  { value: "", label: "Non précisé" },
  { value: "colleague", label: "Collègue" },
  { value: "manager", label: "Manager" },
  { value: "report", label: "Subordonné" },
  { value: "client", label: "Client" },
  { value: "partner", label: "Partenaire" },
  { value: "other", label: "Autre" },
];

export function ProConnectButton({ targetUserId, initialState }: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    formData.set("recipient_id", targetUserId);
    startTransition(async () => {
      const result = await runAction(() => sendProConnection(formData), {
        successMessage: "Demande envoyée ✨",
      });
      if (result?.ok) {
        setState("pending_out");
        setOpen(false);
      }
    });
  }

  if (state === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
        <Network className="w-3.5 h-3.5" aria-hidden />
        Connectés
      </span>
    );
  }
  if (state === "pending_out") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-night/5 text-night-muted text-xs font-semibold">
        Demande envoyée
      </span>
    );
  }
  if (state === "pending_in") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-gold/15 text-gold-deep text-xs font-semibold">
        Réponds dans /network
      </span>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        <Network className="w-3.5 h-3.5" aria-hidden />
        Se connecter
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-night/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-bg border border-line shadow-[0_40px_100px_-30px_rgba(10,31,68,0.55)]"
          >
            <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line bg-white">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gold-deep">
                  Connexion pro
                </p>
                <h2 className="mt-1 font-display text-xl text-night">
                  Démarrer une relation pro
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted hover:text-night"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </header>

            <form action={submit} className="p-6 space-y-4">
              <Field>
                <FieldLabel htmlFor="pc_context">Comment vous connaissez-vous&nbsp;?</FieldLabel>
                <Select id="pc_context" name="context" defaultValue="">
                  {CONTEXT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="pc_intro">Mot d&apos;intro (optionnel)</FieldLabel>
                <textarea
                  id="pc_intro"
                  name="intro"
                  rows={3}
                  maxLength={500}
                  placeholder="Ex. On a travaillé ensemble chez X en 2023."
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
                />
                <FieldHint>500 caractères max.</FieldHint>
              </Field>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Annuler
                </Button>
                <Button type="submit" loading={pending}>
                  {pending ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  ) : (
                    <Network className="w-4 h-4" aria-hidden />
                  )}
                  Envoyer la demande
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
