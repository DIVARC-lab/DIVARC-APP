"use client";

import { Hourglass } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { setConversationAutoDelete } from "../../../eclats-actions";

type AutoDeleteSectionProps = {
  conversationId: string;
  initialDays: 1 | 7 | 30 | null;
};

const OPTIONS: Array<{ value: 1 | 7 | 30 | null; label: string; sub: string }> = [
  { value: null, label: "Jamais", sub: "Les messages restent jusqu'à suppression manuelle." },
  { value: 1, label: "24 heures", sub: "Les nouveaux messages disparaissent après 1 jour." },
  { value: 7, label: "7 jours", sub: "Les nouveaux messages disparaissent après 1 semaine." },
  { value: 30, label: "30 jours", sub: "Les nouveaux messages disparaissent après 1 mois." },
];

/* Section "Disparition automatique" — configure conversations.auto_delete_after_days.
 * Effet : un trigger DB BEFORE INSERT calcule expires_at à partir de
 * la valeur configurée. La purge effective tourne en cron via
 * purge_expired_messages(). */
export function AutoDeleteSection({
  conversationId,
  initialDays,
}: AutoDeleteSectionProps) {
  const [pending, startTransition] = useTransition();

  function handleSelect(days: 1 | 7 | 30 | null) {
    if (days === initialDays) return;
    startTransition(async () => {
      const res = await setConversationAutoDelete(conversationId, days);
      if (res.ok) {
        toast.success(
          days === null
            ? "Disparition désactivée."
            : `Les nouveaux messages disparaîtront après ${days} jour${
                days > 1 ? "s" : ""
              }.`,
        );
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <section className="rounded-3xl bg-white border border-line p-6 sm:p-7">
      <header className="mb-5 flex items-center gap-2">
        <Hourglass className="w-4 h-4 text-gold-deep" aria-hidden />
        <h2 className="font-display text-xl text-night">
          Disparition automatique
        </h2>
      </header>
      <p className="text-sm text-night-muted mb-5">
        Choisis combien de temps les nouveaux messages restent visibles
        avant d&apos;être effacés automatiquement. Les messages déjà
        envoyés ne sont pas affectés.
      </p>

      <ul className="space-y-2">
        {OPTIONS.map((opt) => {
          const active = opt.value === initialDays;
          return (
            <li key={opt.value ?? "never"}>
              <button
                type="button"
                onClick={() => handleSelect(opt.value)}
                disabled={pending}
                aria-pressed={active}
                className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-colors disabled:opacity-50 ${
                  active
                    ? "bg-night text-cream border-night"
                    : "bg-bg border-line hover:border-night/30"
                }`}
              >
                <span
                  className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 ${
                    active
                      ? "border-gold bg-gold"
                      : "border-night/20 bg-transparent"
                  }`}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-bold ${
                      active ? "text-cream" : "text-night"
                    }`}
                  >
                    {opt.label}
                  </p>
                  <p
                    className={`text-xs ${
                      active ? "text-cream/70" : "text-muted"
                    }`}
                  >
                    {opt.sub}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
