"use client";

/* PostKindSelector — Chantier Feed v2.3.
 *
 * Petit bouton "Choisir un format" qui ouvre un menu listant les 4 formats
 * de post DIVARC V2 :
 *
 *   - Standard : reste sur le composer inline existant
 *   - Article : redirige vers /feed/new/article (markdown long-form)
 *   - Thread : redirige vers /feed/new/thread (multi-card)
 *   - Sondage : ouvre directement le PollCreator inline
 *
 * Mobile-first, accessible (aria-haspopup + focus trap léger via ESC).
 */
import { FileText, Layers, ListChecks, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

type Props = {
  onChoosePoll?: () => void;
  className?: string;
};

const KINDS = [
  {
    slug: "standard",
    label: "Post",
    desc: "Une pensée courte, une photo, un moment.",
    icon: Sparkles,
    href: "#standard",
    tone: "gold",
  },
  {
    slug: "article",
    label: "Article",
    desc: "Un texte long avec titre, sous-titre et markdown.",
    icon: FileText,
    href: "/feed/new/article",
    tone: "emerald",
  },
  {
    slug: "thread",
    label: "Thread",
    desc: "Une série de posts liés (style fil de pensées).",
    icon: Layers,
    href: "/feed/new/thread",
    tone: "violet",
  },
  {
    slug: "poll",
    label: "Sondage",
    desc: "Une question, 2 à 4 options, vote ouvert.",
    icon: ListChecks,
    href: "#poll",
    tone: "rose",
  },
] as const;

const TONE_CLASS: Record<string, string> = {
  gold: "bg-gold/15 text-gold-deep",
  emerald: "bg-emerald-50 text-emerald-700",
  violet: "bg-violet-50 text-violet-700",
  rose: "bg-rose-50 text-rose-700",
};

export function PostKindSelector({ onChoosePoll, className }: Props) {
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  function handleAction(slug: string) {
    if (slug === "standard") {
      setOpen(false);
      return;
    }
    if (slug === "poll") {
      setOpen(false);
      onChoosePoll?.();
      return;
    }
    /* article / thread : <Link> gère la navigation, on ferme juste. */
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-bg-soft border border-line text-[11px] font-extrabold text-night hover:border-gold transition-colors",
          className,
        )}
      >
        <Sparkles className="w-3 h-3 text-gold-deep" aria-hidden />
        Format
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choisir un format de publication"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-night/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={sheetRef}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl pb-[max(env(safe-area-inset-bottom),16px)] animate-in slide-in-from-bottom-4 duration-200"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <p className="text-[15px] font-extrabold text-night">
                Quel format ?
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="inline-flex w-7 h-7 items-center justify-center rounded-full text-night-dim hover:bg-bg-soft"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <p className="px-5 text-[12.5px] text-night-soft">
              Choisis l&apos;outil adapté à ce que tu veux dire. Tu peux changer
              d&apos;avis à tout moment.
            </p>

            <ul className="mt-3 px-3 pb-3 space-y-1.5">
              {KINDS.map((k) => {
                const Icon = k.icon;
                const body = (
                  <div className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-bg-soft transition-colors">
                    <span
                      aria-hidden
                      className={cn(
                        "inline-flex w-10 h-10 rounded-xl items-center justify-center",
                        TONE_CLASS[k.tone],
                      )}
                    >
                      <Icon className="w-4 h-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-extrabold text-night">
                        {k.label}
                      </p>
                      <p className="text-[12px] text-night-soft leading-snug">
                        {k.desc}
                      </p>
                    </div>
                  </div>
                );
                if (k.href.startsWith("/")) {
                  return (
                    <li key={k.slug}>
                      <Link
                        href={k.href}
                        onClick={() => handleAction(k.slug)}
                        className="block"
                      >
                        {body}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={k.slug}>
                    <button
                      type="button"
                      onClick={() => handleAction(k.slug)}
                      className="block w-full text-left"
                    >
                      {body}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
