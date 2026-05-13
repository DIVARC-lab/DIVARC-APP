"use client";

/* FeedModeSelector — Chantier Feed v2.3.
 *
 * Sélecteur transparent des 5 modes de tri du feed (cf. /about/feed-algorithm).
 * Mobile-first : pills horizontales scrollables.
 *
 * Le mode courant vient de l'URL (?mode=...). Le changement de mode est un
 * <Link> qui navigue — l'état de la page (scroll, etc.) est géré par Next.
 *
 * Un bouton "Pourquoi ?" ouvre /about/feed-algorithm dans un nouvel onglet
 * pour quiconque veut auditer les formules.
 */
import {
  Eye,
  Flame,
  Layers,
  Sparkles,
  Sprout,
  UsersRound,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { FeedMode } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";

type ModeDef = {
  id: FeedMode;
  label: string;
  icon: typeof Sparkles;
  tone: string;
  short: string;
};

const MODES: ModeDef[] = [
  {
    id: "fresh",
    label: "Frais",
    icon: Sparkles,
    tone: "gold",
    short: "récents, demi-vie 36h",
  },
  {
    id: "conversations",
    label: "Conversations vives",
    icon: Flame,
    tone: "rose",
    short: "discussions actives",
  },
  {
    id: "rising_voices",
    label: "Voix peu entendues",
    icon: Sprout,
    tone: "emerald",
    short: "petits comptes, < 72h",
  },
  {
    id: "inner_circle",
    label: "Mon cercle proche",
    icon: UsersRound,
    tone: "navy",
    short: "amis + messages 30j",
  },
  {
    id: "raw",
    label: "Brut",
    icon: Zap,
    tone: "violet",
    short: "chronologique strict",
  },
];

const TONE_ACTIVE: Record<string, string> = {
  gold: "bg-gold/15 text-gold-deep border-gold",
  rose: "bg-rose-100 text-rose-700 border-rose-400",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-400",
  navy: "bg-night/8 text-night border-night/40",
  violet: "bg-violet-100 text-violet-700 border-violet-400",
};

type Props = {
  current: FeedMode;
  basePath?: string;
};

export function FeedModeSelector({ current, basePath }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const base = basePath ?? pathname ?? "/feed";

  function hrefFor(mode: FeedMode): string {
    const p = new URLSearchParams(searchParams);
    p.set("tab", "transparent");
    p.set("mode", mode);
    return `${base}?${p.toString()}`;
  }

  const activeMode = MODES.find((m) => m.id === current) ?? MODES[0];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-night-dim">
          · Tri du feed
        </p>
        <Link
          href="/about/feed-algorithm"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 text-[10px] font-extrabold text-night-dim hover:text-gold-deep transition-colors"
        >
          <Eye className="w-3 h-3" aria-hidden />
          Pourquoi ce tri ?
        </Link>
      </div>

      <div className="overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]">
        <ul
          className="flex gap-1.5 px-1 min-w-max"
          role="tablist"
          aria-label="Mode de tri du feed"
        >
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = m.id === current;
            return (
              <li key={m.id}>
                <Link
                  href={hrefFor(m.id)}
                  role="tab"
                  aria-selected={active}
                  scroll={false}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-[12px] font-extrabold whitespace-nowrap transition-colors",
                    active
                      ? TONE_ACTIVE[m.tone]
                      : "border-line bg-white text-night-dim hover:text-night hover:border-night-dim/30",
                  )}
                >
                  <Icon className="w-3 h-3" aria-hidden />
                  {m.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="px-1 text-[11px] text-night-soft">
        Mode actif : <strong className="text-night">{activeMode.label}</strong>{" "}
        — {activeMode.short}.
      </p>
    </div>
  );
}
