"use client";

import { Lock, ShieldCheck, ShieldOff, Unlock } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { CryptoUnlockGate } from "@/components/messages/CryptoUnlockGate";
import { useConversationCrypto } from "@/lib/hooks/useConversationCrypto";
import { useCrypto } from "@/lib/hooks/useCrypto";
import { setMyWantsSecret } from "@/app/(app)/messages/secret-actions";

type Props = {
  conversationId: string;
  peerUserId: string | null;
  initialMyWantsSecret: boolean;
  initialPeerWantsSecret: boolean;
  peerHasIdentity: boolean;
  peerDisplayName: string;
};

export function SecretToggle({
  conversationId,
  peerUserId,
  initialMyWantsSecret,
  initialPeerWantsSecret,
  peerHasIdentity,
  peerDisplayName,
}: Props) {
  const { state: cryptoState } = useCrypto();
  const [myWantsSecret, setMy] = useState(initialMyWantsSecret);
  const [peerWantsSecret, setPeer] = useState(initialPeerWantsSecret);
  const [pending, startTransition] = useTransition();
  const [gateOpen, setGateOpen] = useState(false);

  const isEffectiveSecret = myWantsSecret && peerWantsSecret && peerHasIdentity;
  const convCrypto = useConversationCrypto({
    conversationId,
    peerUserId,
    isEffectiveSecret,
  });

  function handleToggle() {
    /* Si on active et qu'on n'a pas encore configuré le coffre crypto,
       on ouvre le gate d'abord. */
    if (!myWantsSecret && cryptoState !== "ready") {
      setGateOpen(true);
      return;
    }

    startTransition(async () => {
      const next = !myWantsSecret;
      const res = await setMyWantsSecret(conversationId, next);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setMy(next);
      setPeer(res.peerWantsSecret);
      if (res.isSecret) {
        toast.success("Mode secret activé : tes prochains messages seront chiffrés.");
      } else if (next) {
        toast.message(
          `Tu as activé le mode secret. En attente de ${peerDisplayName}…`,
        );
      } else {
        toast.message("Mode secret désactivé.");
      }
    });
  }

  return (
    <>
      <section className="space-y-5">
        {/* Statut effectif */}
        <div
          className={cn(
            "rounded-2xl border p-5 flex items-start gap-3",
            isEffectiveSecret
              ? "bg-green-50 border-green-200"
              : "bg-night/5 border-line",
          )}
        >
          <span
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              isEffectiveSecret
                ? "bg-green-600 text-white"
                : "bg-white border border-line text-night-muted",
            )}
          >
            {isEffectiveSecret ? (
              <ShieldCheck className="w-5 h-5" aria-hidden />
            ) : (
              <ShieldOff className="w-5 h-5" aria-hidden />
            )}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-night">
              {isEffectiveSecret
                ? "Conversation secrète active"
                : "Conversation non secrète"}
            </p>
            <p className="mt-0.5 text-[12.5px] text-night-muted">
              {isEffectiveSecret
                ? "Tes prochains messages seront chiffrés bout-en-bout. DIVARC ne peut pas les lire."
                : "Tes messages sont stockés chiffrés côté serveur mais déchiffrables par DIVARC (modération possible)."}
            </p>
          </div>
        </div>

        {/* Toggle */}
        <div className="rounded-2xl bg-white border border-line p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-night">
                Activer le mode secret de mon côté
              </p>
              <p className="mt-1 text-[12.5px] text-night-muted">
                Le mode secret devient effectif uniquement quand{" "}
                <strong>{peerDisplayName}</strong> l&apos;active aussi.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              disabled={pending}
              aria-pressed={myWantsSecret}
              className={cn(
                "relative inline-block w-12 h-7 rounded-full transition-colors shrink-0",
                myWantsSecret ? "bg-gold-deep" : "bg-night/15",
                pending && "opacity-50 cursor-wait",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform",
                  myWantsSecret ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {/* Statut des 2 côtés */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-[11.5px]">
            <div
              className={cn(
                "rounded-lg px-3 py-2 border",
                myWantsSecret
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-line bg-bg-soft text-night-muted",
              )}
            >
              <p className="font-semibold">Moi</p>
              <p>{myWantsSecret ? "Activé" : "Désactivé"}</p>
            </div>
            <div
              className={cn(
                "rounded-lg px-3 py-2 border",
                peerWantsSecret
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-line bg-bg-soft text-night-muted",
              )}
            >
              <p className="font-semibold">{peerDisplayName}</p>
              <p>
                {peerHasIdentity
                  ? peerWantsSecret
                    ? "Activé"
                    : "Désactivé"
                  : "Pas encore configuré"}
              </p>
            </div>
          </div>
        </div>

        {/* Warnings selon l'état */}
        {myWantsSecret && !peerHasIdentity ? (
          <div className="rounded-2xl bg-gold/10 border border-gold/30 p-4 text-[12.5px] text-night-soft">
            ⚠️ {peerDisplayName} n&apos;a pas encore activé le chiffrement de
            son côté. Le mode secret restera inactif tant que ce ne sera pas
            fait.
          </div>
        ) : null}

        {myWantsSecret &&
        peerHasIdentity &&
        !peerWantsSecret ? (
          <div className="rounded-2xl bg-gold/10 border border-gold/30 p-4 text-[12.5px] text-night-soft">
            🕒 En attente que {peerDisplayName} active aussi le mode secret de
            son côté.
          </div>
        ) : null}

        {isEffectiveSecret && convCrypto.state === "ready" ? (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-[12.5px] text-green-700">
            🔐 Session crypto établie. Les nouveaux messages seront chiffrés
            avec une clé partagée dérivée de vos identités.
          </div>
        ) : null}

        {isEffectiveSecret && convCrypto.state === "needs_unlock" ? (
          <div className="rounded-2xl bg-amber-50 border border-amber-300 p-4 text-[12.5px] text-amber-900">
            🔒 Ton coffre crypto est verrouillé.{" "}
            <button
              type="button"
              onClick={() => setGateOpen(true)}
              className="underline font-semibold"
            >
              Déverrouiller maintenant
            </button>
          </div>
        ) : null}

        {/* Lien settings global */}
        <div className="rounded-2xl bg-white border border-line p-4">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-gold/15 text-gold-deep flex items-center justify-center shrink-0">
              {cryptoState === "ready" ? (
                <Unlock className="w-4 h-4" aria-hidden />
              ) : (
                <Lock className="w-4 h-4" aria-hidden />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-night">
                {cryptoState === "uninitialized"
                  ? "Chiffrement non configuré"
                  : cryptoState === "locked"
                    ? "Coffre verrouillé"
                    : "Coffre déverrouillé"}
              </p>
              <p className="mt-0.5 text-[11.5px] text-night-muted">
                Configure ou gère ton coffre crypto.
              </p>
              <Link
                href="/settings/security/encryption"
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-gold-deep hover:underline"
              >
                Paramètres chiffrement →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <CryptoUnlockGate open={gateOpen} onClose={() => setGateOpen(false)} />
    </>
  );
}
