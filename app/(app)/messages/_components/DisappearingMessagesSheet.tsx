"use client";

/* Bottom sheet pour activer/configurer les messages éphémères de la conv.
 *
 * Niveaux : off / 24h / 7j / 30j.
 * Backend : update conversations.auto_delete_after_days (déjà colonne
 * en place depuis migration 0073). */

import { Clock, Loader2, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Props = {
  conversationId: string;
  open: boolean;
  onClose: () => void;
  currentValue: number | null;
};

const OPTIONS: Array<{ value: number | null; label: string; desc: string }> = [
  {
    value: null,
    label: "Désactivé",
    desc: "Les messages restent indéfiniment.",
  },
  {
    value: 1,
    label: "24 heures",
    desc: "Suppression automatique après 1 jour.",
  },
  {
    value: 7,
    label: "7 jours",
    desc: "Suppression automatique après 1 semaine.",
  },
  {
    value: 30,
    label: "30 jours",
    desc: "Suppression automatique après 1 mois.",
  },
];

export function DisappearingMessagesSheet({
  conversationId,
  open,
  onClose,
  currentValue,
}: Props) {
  const [selected, setSelected] = useState<number | null>(currentValue);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelected(currentValue);
  }, [currentValue, open]);

  function handleSave() {
    startTransition(async () => {
      const supabase = createClient();
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { error } = await (supabase as any)
        .from("conversations")
        .update({ auto_delete_after_days: selected })
        .eq("id", conversationId);
      if (error) {
        toast.error(`Échec : ${error.message}`);
        return;
      }
      toast.success(
        selected === null
          ? "Messages éphémères désactivés."
          : `Messages auto-supprimés après ${selected} jour${selected > 1 ? "s" : ""}.`,
      );
      onClose();
    });
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Messages éphémères"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-night/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white text-night p-5 shadow-2xl"
      >
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock
              className="w-4 h-4 text-gold-deep"
              aria-hidden
              strokeWidth={2.4}
            />
            <h2 className="font-display italic text-[20px]">
              Messages <em className="text-gold-deep">éphémères</em>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-bg-soft hover:bg-night/10"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <p className="text-[12px] text-night-dim leading-relaxed mb-4">
          Active la suppression automatique des messages après une durée
          définie. S&apos;applique aux <strong>nouveaux</strong> messages
          envoyés à partir de maintenant.
        </p>

        <ul className="space-y-2 mb-5">
          {OPTIONS.map((opt) => {
            const active = selected === opt.value;
            return (
              <li key={String(opt.value)}>
                <button
                  type="button"
                  onClick={() => setSelected(opt.value)}
                  aria-pressed={active}
                  className={`w-full flex items-start gap-3 p-3 rounded-2xl border text-left transition-colors ${
                    active
                      ? "bg-gold/15 border-gold/50"
                      : "bg-bg-soft border-line hover:bg-night/5"
                  }`}
                >
                  <span
                    className={`mt-1 w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${
                      active
                        ? "bg-gold border-gold"
                        : "bg-transparent border-night-dim/40"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-extrabold text-night">
                      {opt.label}
                    </p>
                    <p className="text-[11.5px] text-night-dim leading-snug">
                      {opt.desc}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="h-10 px-4 rounded-full text-[12px] font-bold text-night-dim hover:text-night"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || selected === currentValue}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-gold text-night text-[12px] font-extrabold hover:bg-gold-soft transition-colors disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <Clock className="w-3.5 h-3.5" aria-hidden strokeWidth={2.6} />
            )}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
