"use client";

import {
  AlertTriangle,
  KeyRound,
  Loader2,
  Lock,
  RotateCcw,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { CryptoUnlockGate } from "@/components/messages/CryptoUnlockGate";
import { useCrypto } from "@/lib/hooks/useCrypto";

/* EncryptionPanel — UI client pour /settings/security/encryption.
 *
 * Affiche le statut crypto + actions :
 *   - Activer chiffrement (si uninitialized)
 *   - Débloquer (si locked)
 *   - Verrouiller maintenant (si ready)
 *   - Réinitialiser mes clés (danger zone) */

export function EncryptionPanel() {
  const { state, errorMessage, lock, reset } = useCrypto();
  const [gateOpen, setGateOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  async function handleReset() {
    setResetting(true);
    try {
      await reset();
      toast.success("Identité crypto réinitialisée.");
      setShowResetConfirm(false);
    } catch {
      toast.error("Erreur lors de la réinitialisation.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <section className="space-y-5">
        <StatusCard state={state} />

        {state === "uninitialized" ? (
          <div className="rounded-2xl bg-white border border-line p-5">
            <h3 className="text-[14px] font-bold text-night">
              Active le chiffrement
            </h3>
            <p className="mt-1 text-[12.5px] text-night-muted">
              Le chiffrement bout-en-bout protège tes conversations marquées
              comme &laquo;&nbsp;secrètes&nbsp;&raquo;. Aucun message secret
              n&apos;est lisible par DIVARC, même avec une demande légale.
            </p>
            <button
              type="button"
              onClick={() => setGateOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-gold-deep text-white text-[13px] font-semibold hover:bg-gold transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
              Configurer ma passphrase
            </button>
          </div>
        ) : null}

        {state === "locked" ? (
          <div className="rounded-2xl bg-white border border-line p-5">
            <h3 className="text-[14px] font-bold text-night">
              Coffre verrouillé
            </h3>
            <p className="mt-1 text-[12.5px] text-night-muted">
              Tes clés sont sécurisées localement. Débloque pour lire et
              envoyer dans tes conversations secrètes.
            </p>
            <button
              type="button"
              onClick={() => setGateOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-night text-cream text-[13px] font-semibold hover:bg-night-soft transition-colors"
            >
              <Unlock className="w-3.5 h-3.5" aria-hidden />
              Débloquer
            </button>
          </div>
        ) : null}

        {state === "ready" ? (
          <div className="rounded-2xl bg-white border border-line p-5">
            <h3 className="text-[14px] font-bold text-night">
              Coffre déverrouillé
            </h3>
            <p className="mt-1 text-[12.5px] text-night-muted">
              Tu peux lire et envoyer dans tes conversations secrètes. La
              passphrase est gardée en mémoire pour cette session. Verrouille
              manuellement quand tu fermes l&apos;app.
            </p>
            <button
              type="button"
              onClick={() => {
                lock();
                toast.success("Coffre verrouillé.");
              }}
              className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-bg-soft border border-line text-night text-[13px] font-semibold hover:bg-night/5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" aria-hidden />
              Verrouiller maintenant
            </button>
          </div>
        ) : null}

        {state === "error" && errorMessage ? (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-5">
            <h3 className="text-[14px] font-bold text-red-700">
              Erreur crypto
            </h3>
            <p className="mt-1 text-[12.5px] text-red-700">{errorMessage}</p>
          </div>
        ) : null}

        {/* Danger zone */}
        {state !== "uninitialized" ? (
          <div className="rounded-2xl bg-white border border-red-200 p-5">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-bold text-night">
                  Réinitialiser mes clés
                </h3>
                <p className="mt-1 text-[12.5px] text-night-muted">
                  Génère une nouvelle paire de clés. Toutes les conversations
                  secrètes existantes deviendront indéchiffrables. Action
                  irréversible.
                </p>

                {!showResetConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="mt-3 inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-red-300 text-red-700 text-[12.5px] font-semibold hover:bg-red-50"
                  >
                    <RotateCcw className="w-3 h-3" aria-hidden />
                    Réinitialiser
                  </button>
                ) : (
                  <div className="mt-3 space-y-2">
                    <p className="text-[12.5px] font-semibold text-red-700">
                      Confirme la réinitialisation. Tu perdras l&apos;accès à
                      tous les messages secrets.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(false)}
                        className="h-9 px-3 rounded-full border border-line text-night-muted text-[12px] font-semibold hover:bg-bg-soft"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleReset}
                        disabled={resetting}
                        className={cn(
                          "h-9 px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5",
                          resetting
                            ? "bg-red-100 text-red-400 cursor-wait"
                            : "bg-red-600 text-white hover:bg-red-700",
                        )}
                      >
                        {resetting ? (
                          <Loader2
                            className="w-3 h-3 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <RotateCcw className="w-3 h-3" aria-hidden />
                        )}
                        Confirmer la réinitialisation
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <CryptoUnlockGate
        open={gateOpen}
        onClose={() => setGateOpen(false)}
      />
    </>
  );
}

function StatusCard({ state }: { state: ReturnType<typeof useCrypto>["state"] }) {
  const config = {
    checking: {
      icon: Loader2,
      bg: "bg-night/5",
      iconColor: "text-night-muted",
      label: "Vérification…",
      desc: "Lecture de ton coffre local.",
      spin: true,
    },
    uninitialized: {
      icon: ShieldCheck,
      bg: "bg-night/5",
      iconColor: "text-night-muted",
      label: "Chiffrement désactivé",
      desc: "Active une passphrase pour utiliser les conversations secrètes.",
      spin: false,
    },
    locked: {
      icon: Lock,
      bg: "bg-night/5",
      iconColor: "text-night-muted",
      label: "Coffre verrouillé",
      desc: "Tes clés sont là, mais le coffre est fermé.",
      spin: false,
    },
    ready: {
      icon: ShieldCheck,
      bg: "bg-green-50",
      iconColor: "text-green-600",
      label: "Coffre déverrouillé",
      desc: "Chiffrement actif. Conversations secrètes lisibles.",
      spin: false,
    },
    error: {
      icon: AlertTriangle,
      bg: "bg-red-50",
      iconColor: "text-red-600",
      label: "Erreur",
      desc: "Un problème est survenu.",
      spin: false,
    },
  }[state];

  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-2xl border border-line p-5 flex items-start gap-3",
        config.bg,
      )}
    >
      <span
        className={cn(
          "w-10 h-10 rounded-xl bg-white border border-line flex items-center justify-center shrink-0",
          config.iconColor,
        )}
      >
        <Icon
          className={cn("w-5 h-5", config.spin && "animate-spin")}
          aria-hidden
        />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-night">{config.label}</p>
        <p className="mt-0.5 text-[12.5px] text-night-muted">{config.desc}</p>
      </div>
    </div>
  );
}
