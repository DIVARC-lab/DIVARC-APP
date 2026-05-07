"use client";

import { CheckCircle2, Send, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
} from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Input";
import { applyToJob, type ApplicationFormState } from "../../actions";

const INITIAL: ApplicationFormState = { status: "idle" };

type ApplyDialogProps = {
  jobId: string;
  jobTitle: string;
};

export function ApplyDialog({ jobId, jobTitle }: ApplyDialogProps) {
  const [open, setOpen] = useState(false);
  const boundAction = applyToJob.bind(null, jobId);
  const [state, formAction, pending] = useActionState<
    ApplicationFormState,
    FormData
  >(boundAction, INITIAL);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Candidature envoyée.");
      setOpen(false);
    }
    if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state]);

  useEffect(() => {
    if (!open) return;
    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  return (
    <>
      <Button onClick={() => setOpen(true)} size="lg">
        <Send className="w-4 h-4" aria-hidden />
        Postuler
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
            className="w-full max-w-lg rounded-3xl bg-bg border border-line shadow-[0_40px_100px_-30px_rgba(10,31,68,0.55)] overflow-hidden"
          >
            <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line bg-white">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gold-deep">
                  Candidature
                </p>
                <h2 className="mt-1 font-display text-2xl text-night text-balance">
                  Postuler à « {jobTitle} »
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

            <form action={formAction} className="p-6 space-y-5">
              <Field>
                <FieldLabel htmlFor="application-message" required>
                  Message au recruteur
                </FieldLabel>
                <Textarea
                  id="application-message"
                  name="message"
                  rows={6}
                  required
                  minLength={10}
                  maxLength={2000}
                  placeholder="Pourquoi ce poste ? Tes expériences clés ? Ta disponibilité ?"
                  invalid={Boolean(state.fieldErrors?.message)}
                />
                <FieldHint>
                  Ton profil DIVARC sera automatiquement partagé avec le
                  recruteur.
                </FieldHint>
                <FieldError>{state.fieldErrors?.message}</FieldError>
              </Field>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Annuler
                </Button>
                <Button type="submit" loading={pending}>
                  {!pending ? <CheckCircle2 className="w-4 h-4" aria-hidden /> : null}
                  Envoyer ma candidature
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
