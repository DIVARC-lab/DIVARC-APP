"use client";

import {
  Bell,
  Check,
  Loader2,
  PartyPopper,
  Pin,
  Shield,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { dismissCircleOnboarding } from "../../actions";
import { cn } from "@/lib/utils/cn";

type ChecklistItem = {
  icon: typeof Check;
  label: string;
  href: string;
};

type Props = {
  circleId: string;
  circleSlug: string;
  circleName: string;
  emoji: string | null;
  colorAccent: string;
  welcomeMessage: string | null;
  hasPinnedPost: boolean;
};

export function CircleWelcomeModal({
  circleId,
  circleSlug,
  circleName,
  emoji,
  colorAccent,
  welcomeMessage,
  hasPinnedPost,
}: Props) {
  const [open, setOpen] = useState(true);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();

  const items: ChecklistItem[] = [
    {
      icon: Pin,
      label: hasPinnedPost
        ? "Lire le post épinglé et te présenter"
        : "Faire un premier post pour te présenter",
      href: `/circles/${circleSlug}`,
    },
    {
      icon: Shield,
      label: "Parcourir les règles du cercle",
      href: `/circles/${circleSlug}/about`,
    },
    {
      icon: Users,
      label: "Découvrir les membres actifs",
      href: `/circles/${circleSlug}/members`,
    },
    {
      icon: Bell,
      label: "Personnaliser tes notifications",
      href: `/circles/${circleSlug}/notifications`,
    },
  ];

  function toggle(i: number) {
    setChecked((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function dismiss() {
    setOpen(false);
    startTransition(async () => {
      const result = await dismissCircleOnboarding(circleId);
      if (!result.ok) {
        /* Erreur silencieuse — pas grave si ça échoue, le modal réapparaîtra. */
        toast.error(result.error ?? "Action impossible.");
      }
    });
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Bienvenue dans ${circleName}`}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-night/60 backdrop-blur-sm sm:p-4 overflow-y-auto"
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white border-t sm:border border-line rounded-t-3xl sm:rounded-3xl shadow-[0_40px_100px_-30px_rgba(10,31,68,0.55)] max-h-[92dvh] overflow-y-auto"
      >
        {/* Hero gradient */}
        <div
          className="relative px-5 pt-6 pb-5 text-cream"
          style={{
            backgroundImage: `linear-gradient(135deg, ${colorAccent}, color-mix(in srgb, ${colorAccent} 50%, #0A1F44))`,
          }}
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fermer"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 inline-flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
          <PartyPopper className="w-6 h-6 mb-2" aria-hidden />
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-cream/85">
            · Bienvenue
          </p>
          <h2 className="mt-1 font-display italic text-[24px] sm:text-[28px] leading-tight">
            {emoji ? <span className="mr-1">{emoji}</span> : null}
            {circleName}
          </h2>
        </div>

        {/* Welcome message (par l'admin du cercle) */}
        {welcomeMessage ? (
          <div className="px-5 pt-4">
            <p className="text-[13px] text-night-soft leading-relaxed whitespace-pre-line italic border-l-2 border-gold pl-3">
              {welcomeMessage}
            </p>
          </div>
        ) : null}

        {/* Checklist */}
        <div className="px-5 pt-4 pb-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gold-deep mb-2">
            · Pour bien démarrer
          </p>
          <ul className="space-y-1.5">
            {items.map((item, i) => {
              const Icon = item.icon;
              const isChecked = checked.has(i);
              return (
                <li key={i}>
                  <Link
                    href={item.href}
                    onClick={() => toggle(i)}
                    className={cn(
                      "flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors",
                      isChecked
                        ? "bg-success-bg border-success/30"
                        : "bg-bg-soft border-line hover:border-night/30",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "inline-flex w-6 h-6 rounded-md items-center justify-center shrink-0",
                        isChecked
                          ? "bg-success text-white"
                          : "bg-white border border-line text-night-dim",
                      )}
                    >
                      {isChecked ? (
                        <Check className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <Icon className="w-3.5 h-3.5" aria-hidden />
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-[13px]",
                        isChecked
                          ? "text-success line-through font-medium"
                          : "text-night font-semibold",
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <footer className="px-5 pb-5 pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            disabled={pending}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-night text-cream text-[12px] font-extrabold hover:bg-night-soft transition-colors disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : null}
            Commencer
          </button>
        </footer>
      </div>
    </div>
  );
}
