"use client";

import { ArrowRight, Phone, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, FieldHint, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

type Step = "phone" | "code";

const PHONE_REGEX = /^\+\d[\d\s().-]{6,20}$/;

export function PhoneLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSendCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const cleaned = phone.trim().replace(/\s+/g, "");
    if (!PHONE_REGEX.test(phone.trim())) {
      setError("Numéro invalide. Inclus l'indicatif pays (ex : +33 6 12 34 56 78).");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        phone: cleaned,
        options: { shouldCreateUser: false },
      });
      if (error) {
        setError(error.message);
        return;
      }
      toast.success("Code envoyé par SMS.");
      setStep("code");
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
      const cleaned = phone.trim().replace(/\s+/g, "");
      const { error } = await supabase.auth.verifyOtp({
        phone: cleaned,
        token,
        type: "sms",
      });
      if (error) {
        setError("Code incorrect ou expiré.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    });
  }

  if (step === "code") {
    return (
      <form onSubmit={handleVerify} className="space-y-5" noValidate>
        <div className="p-4 rounded-2xl bg-gold/10 border border-gold/30">
          <p className="text-sm text-night-soft">
            On t&apos;a envoyé un code à 6 chiffres au{" "}
            <span className="font-semibold text-night">{phone}</span>.
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="code" required>
            Code de vérification
          </FieldLabel>
          <div className="relative">
            <ShieldCheck
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
              aria-hidden
            />
            <Input
              id="code"
              name="code"
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

        <div className="flex flex-col gap-2">
          <Button type="submit" loading={pending} size="lg" className="w-full">
            {pending ? "Vérification..." : (
              <>
                Vérifier le code
                <ArrowRight className="w-4 h-4" aria-hidden />
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError(null);
            }}
            disabled={pending}
          >
            ← Changer de numéro
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendCode} className="space-y-5" noValidate>
      <Field>
        <FieldLabel htmlFor="phone" required>
          Numéro de téléphone
        </FieldLabel>
        <div className="relative">
          <Phone
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            aria-hidden
          />
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+33 6 12 34 56 78"
            className="pl-11"
            invalid={Boolean(error)}
          />
        </div>
        <FieldHint>
          On t&apos;envoie un code à 6 chiffres par SMS. Frais SMS standards.
        </FieldHint>
        {error ? (
          <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>
        ) : null}
      </Field>

      <Button type="submit" loading={pending} size="lg" className="w-full">
        {pending ? "Envoi..." : (
          <>
            Recevoir un code
            <ArrowRight className="w-4 h-4" aria-hidden />
          </>
        )}
      </Button>
    </form>
  );
}
