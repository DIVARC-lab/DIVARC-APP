"use client";

import { Check, Copy, Loader2, ShieldCheck, X } from "lucide-react";
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

type MFAEnrollDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type EnrollState =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "ready";
      factorId: string;
      qrCode: string;
      secret: string;
    };

export function MFAEnrollDialog({
  open,
  onClose,
  onSuccess,
}: MFAEnrollDialogProps) {
  const [state, setState] = useState<EnrollState>({ kind: "idle" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  async function start() {
    setState({ kind: "loading" });
    const supabase = createClient();

    // Clean up any existing unverified factors so the user can retry
    const { data: factors } = await supabase.auth.mfa.listFactors();
    for (const factor of factors?.totp ?? []) {
      if (factor.status !== "verified") {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `DIVARC · ${new Date().toLocaleDateString("fr-FR")}`,
    });

    if (enrollError || !data) {
      toast.error("Impossible de démarrer la 2FA.");
      onClose();
      return;
    }

    setState({
      kind: "ready",
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  /* React 19 strict : queueMicrotask pour le reset à la fermeture pour
     éviter cascading render synchrone (set-state-in-effect). `start` est
     déclarée au-dessus de l'effect pour respecter react-hooks/immutability. */
  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setState({ kind: "idle" });
        setCode("");
        setError(null);
      });
      return;
    }
    queueMicrotask(() => {
      void start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function verify() {
    if (state.kind !== "ready") return;
    if (code.trim().length !== 6) {
      setError("Le code doit faire 6 chiffres.");
      return;
    }

    setVerifying(true);
    setError(null);
    const supabase = createClient();
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId: state.factorId });

    if (challengeError || !challenge) {
      setError("Impossible de générer le challenge.");
      setVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: state.factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });

    setVerifying(false);

    if (verifyError) {
      setError("Code invalide. Réessaie.");
      return;
    }

    toast.success("2FA activée ✨");
    onSuccess();
  }

  async function copySecret() {
    if (state.kind !== "ready") return;
    try {
      await navigator.clipboard.writeText(state.secret);
      toast.success("Clé copiée.");
    } catch {
      toast.error("Impossible de copier.");
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-night/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-bg border border-line shadow-[0_40px_100px_-30px_rgba(10,31,68,0.55)] overflow-hidden"
      >
        <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line bg-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gold-deep">
              Sécurité
            </p>
            <h2 className="mt-1 font-display text-2xl text-night">
              Activer la 2FA
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted hover:text-night"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <div className="p-6 space-y-5">
          {state.kind === "loading" || state.kind === "idle" ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2
                className="w-8 h-8 animate-spin text-night-muted"
                aria-hidden
              />
              <p className="text-sm text-muted">Génération du QR code…</p>
            </div>
          ) : null}

          {state.kind === "ready" ? (
            <>
              <ol className="space-y-1 text-sm text-night-muted leading-relaxed list-decimal list-inside">
                <li>
                  Installe une appli d&apos;authentification (Google
                  Authenticator, Authy, 1Password…).
                </li>
                <li>Scanne le QR code OU copie la clé manuellement.</li>
                <li>Entre le code à 6 chiffres généré.</li>
              </ol>

              <div className="flex justify-center">
                <div className="p-3 rounded-2xl bg-white border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.qrCode}
                    alt="QR code de configuration"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={copySecret}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-night/[0.03] border border-line text-left hover:bg-night/[0.06] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                    Clé secrète (manuelle)
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-night truncate">
                    {state.secret}
                  </p>
                </div>
                <Copy className="w-4 h-4 text-night-muted shrink-0" aria-hidden />
              </button>

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
                    const next = event.currentTarget.value.replace(/\D/g, "");
                    setCode(next);
                    setError(null);
                  }}
                  placeholder="123 456"
                  className="text-center font-mono text-xl tracking-widest"
                  invalid={Boolean(error)}
                />
                <FieldHint>
                  Le code change toutes les 30 secondes.
                </FieldHint>
                <FieldError>{error}</FieldError>
              </Field>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  disabled={verifying}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={verify}
                  loading={verifying}
                  disabled={code.length !== 6}
                >
                  {!verifying ? <Check className="w-4 h-4" aria-hidden /> : null}
                  Activer la 2FA
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const MFAIcon = ShieldCheck;
