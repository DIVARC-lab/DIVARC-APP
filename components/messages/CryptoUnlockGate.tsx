"use client";

import { KeyRound, Loader2, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useCrypto } from "@/lib/hooks/useCrypto";

/* CryptoUnlockGate — modal qui apparaît au-dessus de l'UI quand l'user
 * doit débloquer son coffre crypto.
 *
 * Comportement :
 *   - state "uninitialized" : formulaire "Crée ta passphrase crypto"
 *   - state "locked"        : formulaire "Saisis ta passphrase"
 *   - state "ready"         : masqué (rien à afficher)
 *
 * La passphrase est SÉPARÉE du mot de passe Supabase Auth. C'est volontaire :
 *   - Supabase ne donne jamais le password en clair côté client (sécurité)
 *   - Une passphrase dédiée permet de séparer "accès compte" de "lecture
 *     messages secrets" (comme Telegram secret chats).
 *
 * Si forceOpen=true, le gate s'affiche même si state=ready (ex: pour
 * settings/security). Sinon il ne s'affiche que pour locked/uninit. */

type Props = {
  open: boolean;
  onClose?: () => void;
  /* Texte custom selon le contexte (ex: "Active le chiffrement pour
     créer une conversation secrète"). */
  title?: string;
  description?: string;
};

export function CryptoUnlockGate({
  open,
  onClose,
  title,
  description,
}: Props) {
  const { state, errorMessage, unlock } = useCrypto();
  const [passphrase, setPassphrase] = useState("");
  const [passphraseConfirm, setPassphraseConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  /* Auto-close si state passe à ready */
  useEffect(() => {
    if (state === "ready" && open) {
      setPassphrase("");
      setPassphraseConfirm("");
      onClose?.();
    }
  }, [state, open, onClose]);

  /* ESC pour fermer (seulement si onClose dispo) */
  useEffect(() => {
    if (!open || !onClose) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isInit = state === "uninitialized";
  const needsConfirm = isInit;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (passphrase.length < 8) {
      setLocalError("La passphrase doit faire au moins 8 caractères.");
      return;
    }
    if (needsConfirm && passphrase !== passphraseConfirm) {
      setLocalError("Les passphrases ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await unlock(passphrase);
      if (!result.ok) {
        setLocalError(result.error ?? "Erreur.");
      }
      /* onClose appelé via useEffect quand state passe à ready */
    } finally {
      setSubmitting(false);
    }
  }

  const displayError = localError ?? errorMessage;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crypto-gate-title"
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0">
              {isInit ? (
                <ShieldCheck className="w-5 h-5" aria-hidden />
              ) : (
                <KeyRound className="w-5 h-5" aria-hidden />
              )}
            </span>
            <div className="min-w-0">
              <p
                id="crypto-gate-title"
                className="text-[14px] font-bold text-night"
              >
                {title ??
                  (isInit
                    ? "Active le chiffrement"
                    : "Débloque tes conversations secrètes")}
              </p>
              <p className="mt-0.5 text-[12px] text-night-muted">
                {description ??
                  (isInit
                    ? "Crée une passphrase qui chiffre tes messages secrets."
                    : "Saisis ta passphrase crypto pour lire/envoyer des messages secrets.")}
              </p>
            </div>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="w-8 h-8 rounded-full hover:bg-bg-soft flex items-center justify-center shrink-0"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          ) : null}
        </header>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label
              htmlFor="crypto-passphrase"
              className="block text-[12px] font-semibold text-night mb-1.5"
            >
              Passphrase crypto
            </label>
            <input
              id="crypto-passphrase"
              type="password"
              autoComplete={isInit ? "new-password" : "current-password"}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Min 8 caractères"
              autoFocus
              minLength={8}
              required
              className="w-full h-11 px-3 rounded-lg border border-line bg-bg-soft text-[14px] text-night focus:border-gold-deep focus:outline-none focus:bg-white"
            />
          </div>

          {needsConfirm ? (
            <div>
              <label
                htmlFor="crypto-passphrase-confirm"
                className="block text-[12px] font-semibold text-night mb-1.5"
              >
                Confirme la passphrase
              </label>
              <input
                id="crypto-passphrase-confirm"
                type="password"
                autoComplete="new-password"
                value={passphraseConfirm}
                onChange={(e) => setPassphraseConfirm(e.target.value)}
                minLength={8}
                required
                className="w-full h-11 px-3 rounded-lg border border-line bg-bg-soft text-[14px] text-night focus:border-gold-deep focus:outline-none focus:bg-white"
              />
            </div>
          ) : null}

          {displayError ? (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[12.5px] text-red-700">
              {displayError}
            </div>
          ) : null}

          {isInit ? (
            <div className="rounded-lg bg-gold/10 border border-gold/30 px-3 py-2 text-[11.5px] text-night-soft">
              ⚠️ Note bien cette passphrase. Sans elle, tu perdras l&apos;accès
              à toutes tes conversations secrètes (DIVARC ne peut pas la
              récupérer — c&apos;est le principe du chiffrement bout-en-bout).
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "w-full h-11 rounded-full text-[13px] font-semibold inline-flex items-center justify-center gap-2 transition-colors",
              submitting
                ? "bg-night/10 text-night-muted cursor-wait"
                : "bg-night text-cream hover:bg-night-soft",
            )}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <ShieldCheck className="w-4 h-4" aria-hidden />
            )}
            {isInit ? "Activer le chiffrement" : "Débloquer"}
          </button>
        </form>
      </div>
    </div>
  );
}
