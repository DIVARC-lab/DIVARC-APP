"use client";

import { BadgeCheck, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { submitVerification } from "./actions";

/* SubmitVerificationForm — formulaire stub V1.
 *
 * V1 simplifié : on stocke des URLs Storage que l'user upload séparément
 * (avatar bucket) ou on accepte juste des notes pour le V1 stub.
 *
 * V2 : workflow complet avec upload guidé + auto-check Stripe Identity. */

const TYPES: Array<{
  id: "identity" | "press" | "professional" | "business";
  label: string;
  description: string;
}> = [
  {
    id: "identity",
    label: "Identité (badge bleu ✓)",
    description: "Pièce d'identité confirmée. Gratuit pour tous.",
  },
  {
    id: "press",
    label: "Personnalité publique (badge or ✦)",
    description: "Journalistes, élus, célébrités. Review humaine.",
  },
  {
    id: "professional",
    label: "Profil pro vérifié",
    description: "Email pro + 1+ expérience confirmée. Boost recherche pro.",
  },
  {
    id: "business",
    label: "Entreprise vérifiée",
    description: "KYB complet pour les pages /c/[slug].",
  },
];

export function SubmitVerificationForm() {
  const [type, setType] = useState<typeof TYPES[number]["id"]>("identity");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (pending) return;
    startTransition(async () => {
      const res = await submitVerification({
        verification_type: type,
        applicant_notes: notes || null,
      });
      if (res.ok) {
        toast.success("Demande envoyée. Tu seras notifié sous 7 jours.");
        setNotes("");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-night-muted">
          Type de vérification
        </p>
        <ul className="space-y-2">
          {TYPES.map((t) => (
            <li key={t.id}>
              <label
                className={cn(
                  "flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors",
                  type === t.id
                    ? "border-gold-deep bg-gold/5"
                    : "border-line bg-white hover:border-night/30",
                )}
              >
                <input
                  type="radio"
                  name="verification_type"
                  value={t.id}
                  checked={type === t.id}
                  onChange={() => setType(t.id)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                    type === t.id
                      ? "border-gold-deep bg-gold-deep"
                      : "border-night/20 bg-white",
                  )}
                >
                  {type === t.id ? (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  ) : null}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-night">
                    {t.label}
                  </p>
                  <p className="text-[12px] text-night-muted">{t.description}</p>
                </div>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-night-muted mb-2">
          Notes à l&apos;équipe DIVARC (optionnel)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
          rows={4}
          placeholder="Liens vers ton site, articles de presse, pages Wikipedia, etc."
          className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[13.5px] text-night focus:border-gold-deep focus:outline-none resize-none"
        />
        <p className="mt-1 text-[11px] text-night-dim text-right tabular-nums">
          {notes.length}/1000
        </p>
      </div>

      <div className="rounded-xl bg-bg-soft border border-line p-4">
        <p className="text-[12px] text-night-muted">
          ℹ️ V1 : review humaine par l&apos;équipe DIVARC sous 7 jours.
          V2 : intégration Stripe Identity pour vérification automatique
          (~1.50€/check).
        </p>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending}
        className={cn(
          "h-11 px-6 rounded-full text-[13px] font-semibold inline-flex items-center gap-2 transition-colors",
          pending
            ? "bg-night/10 text-night-muted cursor-wait"
            : "bg-night text-cream hover:bg-night-soft",
        )}
      >
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        ) : (
          <BadgeCheck className="w-4 h-4" aria-hidden />
        )}
        {pending ? "Envoi…" : "Soumettre ma demande"}
      </button>
    </div>
  );
}
