"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
} from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

export function MFAForm() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const supabase = createClient();
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError || !data) {
      toast.error("Impossible de charger les facteurs.");
      return;
    }
    const verified = data.totp.find((factor) => factor.status === "verified");
    if (!verified) {
      // No factor — fall back to dashboard
      router.push("/dashboard");
      return;
    }
    setFactorId(verified.id);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId) return;
    if (code.trim().length !== 6) {
      setError("Le code doit faire 6 chiffres.");
      return;
    }

    setVerifying(true);
    setError(null);
    const supabase = createClient();
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError || !challenge) {
      setError("Impossible de générer le challenge.");
      setVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });

    setVerifying(false);

    if (verifyError) {
      setError("Code invalide. Réessaie.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <Field>
        <FieldLabel htmlFor="mfa-code" required>
          Code à 6 chiffres
        </FieldLabel>
        <Input
          id="mfa-code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(event) => {
            setCode(event.currentTarget.value.replace(/\D/g, ""));
            setError(null);
          }}
          autoFocus
          required
          placeholder="123 456"
          className="text-center font-mono text-2xl tracking-widest"
          invalid={Boolean(error)}
        />
        <FieldHint>
          Génère le code dans ton appli d&apos;authentification (le code
          change toutes les 30 secondes).
        </FieldHint>
        <FieldError>{error}</FieldError>
      </Field>

      <Button
        type="submit"
        loading={verifying}
        disabled={code.length !== 6 || !factorId}
        size="lg"
        className="w-full"
      >
        {!verifying ? <ShieldCheck className="w-4 h-4" aria-hidden /> : null}
        Vérifier
        {!verifying ? <ArrowRight className="w-4 h-4" aria-hidden /> : null}
      </Button>
    </form>
  );
}
