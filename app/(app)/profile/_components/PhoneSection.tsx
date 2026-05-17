"use client";

import { Loader2, Phone, ShieldCheck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, FieldHint, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

type Step = "view" | "request" | "verify";

const PHONE_REGEX = /^\+\d[\d\s().-]{6,20}$/;

export function PhoneSection() {
  const [step, setStep] = useState<Step>("view");
  const [currentPhone, setCurrentPhone] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [newPhone, setNewPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  async function reload() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      setLoading(false);
      return;
    }
    setCurrentPhone(data.user.phone ?? null);
    setConfirmed(Boolean(data.user.phone_confirmed_at));
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void reload();
    });
  }, []);

  function handleRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!PHONE_REGEX.test(newPhone.trim())) {
      setError("Numéro invalide. Inclus l'indicatif pays (ex : +33 6 12 34 56 78).");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const cleaned = newPhone.trim().replace(/\s+/g, "");
      const { error } = await supabase.auth.updateUser({ phone: cleaned });
      if (error) {
        setError(error.message);
        return;
      }
      toast.success("Code envoyé par SMS.");
      setStep("verify");
    });
  }

  function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const token = code.trim();
    if (token.length < 4) {
      setError("Code invalide.");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const cleaned = newPhone.trim().replace(/\s+/g, "");
      const { error } = await supabase.auth.verifyOtp({
        phone: cleaned,
        token,
        type: currentPhone ? "phone_change" : "sms",
      });
      if (error) {
        setError("Code incorrect ou expiré.");
        return;
      }
      toast.success("Numéro vérifié.");
      setStep("view");
      setNewPhone("");
      setCode("");
      await reload();
    });
  }

  return (
    <section className="p-6 sm:p-8 rounded-3xl bg-white border border-line shadow-soft">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-night/5 flex items-center justify-center">
          <Phone className="w-4 h-4 text-night" aria-hidden />
        </div>
        <div>
          <h3 className="font-display text-xl text-night">Numéro de téléphone</h3>
          <p className="text-sm text-muted">
            Utilisé pour la connexion par SMS et la récupération de compte.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-muted animate-spin" aria-hidden />
        </div>
      ) : step === "view" ? (
        <article className="p-4 rounded-2xl bg-night/[0.02] border border-line">
          {currentPhone ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                Téléphone actuel
              </p>
              <p className="mt-1 text-sm font-medium text-night">{currentPhone}</p>
              <p
                className={`mt-1 text-xs flex items-center gap-1 ${
                  confirmed ? "text-emerald-700" : "text-gold-deep"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    confirmed ? "bg-emerald-500" : "bg-gold"
                  }`}
                />
                {confirmed ? "Vérifié" : "Non vérifié"}
              </p>
              <div className="mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setStep("request");
                    setError(null);
                  }}
                >
                  Changer le numéro
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-night-muted">
                Aucun numéro de téléphone associé à ton compte.
              </p>
              <div className="mt-3">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setStep("request");
                    setError(null);
                  }}
                >
                  <Phone className="w-3.5 h-3.5" aria-hidden />
                  Ajouter un numéro
                </Button>
              </div>
            </>
          )}
        </article>
      ) : step === "request" ? (
        <form onSubmit={handleRequest} className="space-y-4 max-w-md" noValidate>
          <Field>
            <FieldLabel htmlFor="newPhone" required>
              {currentPhone ? "Nouveau numéro" : "Numéro de téléphone"}
            </FieldLabel>
            <div className="relative">
              <Phone
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
                aria-hidden
              />
              <Input
                id="newPhone"
                name="newPhone"
                type="tel"
                autoComplete="tel"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+33 6 12 34 56 78"
                className="pl-11"
                invalid={Boolean(error)}
              />
            </div>
            <FieldHint>Frais SMS standards. Inclus l&apos;indicatif pays.</FieldHint>
            {error ? (
              <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>
            ) : null}
          </Field>
          <div className="flex items-center gap-2">
            <Button type="submit" loading={pending}>
              Envoyer le code
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep("view");
                setNewPhone("");
                setError(null);
              }}
              disabled={pending}
            >
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4 max-w-md" noValidate>
          <div className="p-4 rounded-2xl bg-gold/10 border border-gold/30">
            <p className="text-sm text-night-soft">
              Code envoyé au <span className="font-semibold text-night">{newPhone}</span>.
            </p>
          </div>
          <Field>
            <FieldLabel htmlFor="phoneCode" required>
              Code de vérification
            </FieldLabel>
            <div className="relative">
              <ShieldCheck
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
                aria-hidden
              />
              <Input
                id="phoneCode"
                name="phoneCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                minLength={4}
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="123456"
                className="pl-11 tracking-widest text-center text-lg"
                invalid={Boolean(error)}
                autoFocus
              />
            </div>
            <FieldHint>Le code expire dans 5 minutes.</FieldHint>
            {error ? (
              <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>
            ) : null}
          </Field>
          <div className="flex items-center gap-2">
            <Button type="submit" loading={pending}>
              Vérifier
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep("request");
                setCode("");
                setError(null);
              }}
              disabled={pending}
            >
              ← Changer le numéro
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
