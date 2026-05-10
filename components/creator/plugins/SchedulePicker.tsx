"use client";

import { Clock, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

/* SchedulePicker — modal pour programmer la publication.
 *
 * Datetime local input (pas de fuseau horaire pour V1, on convertit
 * en ISO UTC à la soumission).
 *
 * Contraintes :
 *   - Date min = maintenant + 10 minutes
 *   - Date max = maintenant + 6 mois (pas plus pour des raisons UX)
 *
 * Output : ISO timestamp ou null. */

const MIN_LEAD_MS = 10 * 60 * 1000; // 10 minutes
const MAX_LEAD_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 mois

type Props = {
  initialValue: string | null;
  onApply: (isoTimestamp: string | null) => void;
  onClose: () => void;
};

export function SchedulePicker({ initialValue, onApply, onClose }: Props) {
  const [datetimeLocal, setDatetimeLocal] = useState<string>(() => {
    if (!initialValue) return defaultDatetimeLocal();
    return isoToDatetimeLocal(initialValue);
  });
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    if (!datetimeLocal) {
      onApply(null);
      onClose();
      return;
    }
    const ms = new Date(datetimeLocal).getTime();
    if (Number.isNaN(ms)) {
      setError("Date invalide.");
      return;
    }
    const nowMs = Date.now();
    if (ms < nowMs + MIN_LEAD_MS) {
      setError("La publication doit être au moins 10 min plus tard.");
      return;
    }
    if (ms > nowMs + MAX_LEAD_MS) {
      setError("Maximum 6 mois à l'avance.");
      return;
    }
    onApply(new Date(ms).toISOString());
    onClose();
  };

  const clear = () => {
    onApply(null);
    onClose();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <p className="font-display italic text-[18px] text-night flex items-center gap-2">
          <Clock className="w-4 h-4 text-gold-deep" aria-hidden />
          Programmer la publication
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-night-muted hover:text-night"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" aria-hidden />
        </button>
      </header>

      <div className="flex-1 px-4 py-4 space-y-3">
        <p className="text-[12.5px] text-night-soft leading-snug">
          Choisis quand ton post sera publié. Tu peux le modifier ou le
          supprimer avant cette date depuis tes brouillons.
        </p>

        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-1.5">
            Date et heure
          </label>
          <input
            type="datetime-local"
            value={datetimeLocal}
            onChange={(e) => {
              setDatetimeLocal(e.target.value);
              setError(null);
            }}
            min={isoToDatetimeLocal(
              new Date(Date.now() + MIN_LEAD_MS).toISOString(),
            )}
            max={isoToDatetimeLocal(
              new Date(Date.now() + MAX_LEAD_MS).toISOString(),
            )}
            className="w-full px-3 py-2.5 rounded-xl border border-line bg-white text-[13.5px]"
          />
          {error ? (
            <p className="mt-1.5 text-[11.5px] text-red-600">{error}</p>
          ) : null}
        </div>

        {/* Quick presets. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <PresetBtn onClick={() => setDatetimeLocal(plusHours(1))}>
            +1 h
          </PresetBtn>
          <PresetBtn onClick={() => setDatetimeLocal(plusHours(6))}>
            +6 h
          </PresetBtn>
          <PresetBtn onClick={() => setDatetimeLocal(plusHours(24))}>
            Demain
          </PresetBtn>
          <PresetBtn onClick={() => setDatetimeLocal(plusHours(24 * 7))}>
            +1 semaine
          </PresetBtn>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-2 px-4 py-3 border-t border-line bg-bg-soft">
        {initialValue ? (
          <button
            type="button"
            onClick={clear}
            className="text-[12.5px] text-night-muted hover:text-red-600 font-semibold"
          >
            Retirer la programmation
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={apply}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-night text-cream text-[13px] font-bold"
        >
          Programmer
        </button>
      </footer>
    </div>
  );
}

function PresetBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-[12px] font-semibold border border-line bg-white text-night-muted hover:bg-bg-soft transition-colors",
      )}
    >
      {children}
    </button>
  );
}

function defaultDatetimeLocal(): string {
  /* Default : dans 1 heure, arrondi aux 5 min. */
  const future = new Date(Date.now() + 60 * 60 * 1000);
  future.setMinutes(Math.ceil(future.getMinutes() / 5) * 5, 0, 0);
  return isoToDatetimeLocal(future.toISOString());
}

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function plusHours(h: number): string {
  return isoToDatetimeLocal(new Date(Date.now() + h * 60 * 60 * 1000).toISOString());
}
