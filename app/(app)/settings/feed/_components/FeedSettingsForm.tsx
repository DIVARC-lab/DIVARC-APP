"use client";

/* FeedSettingsForm — Chantier Feed 6.4.
 *
 * Form pour activer/désactiver les 3 garde-fous + choisir le mode par défaut.
 * Toggle = checkbox stylé (gold quand on). Submit via server action.
 */
import {
  Clock,
  Layers,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import type { FeedMode } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import {
  updateFeedSettings,
  type FeedSettingsFormState,
} from "../actions";

const INITIAL: FeedSettingsFormState = { status: "idle" };

type Initial = {
  anti_doomscroll_enabled: boolean;
  author_diversity_enabled: boolean;
  signal_filter_enabled: boolean;
  default_feed_mode: FeedMode;
};

type Props = {
  initial: Initial;
};

const MODES: Array<{ id: FeedMode; label: string; desc: string }> = [
  { id: "fresh", label: "Frais", desc: "récents, demi-vie 36h" },
  {
    id: "conversations",
    label: "Conversations vives",
    desc: "discussions actives",
  },
  {
    id: "rising_voices",
    label: "Voix peu entendues",
    desc: "petits comptes, < 72h",
  },
  {
    id: "inner_circle",
    label: "Mon cercle proche",
    desc: "amis + messages 30j",
  },
  { id: "raw", label: "Brut", desc: "chronologique strict, 0 filtre" },
];

const GUARDRAILS: Array<{
  key: keyof Omit<Initial, "default_feed_mode">;
  icon: typeof ShieldCheck;
  title: string;
  desc: string;
}> = [
  {
    key: "anti_doomscroll_enabled",
    icon: Clock,
    title: "Pause anti-doomscroll",
    desc: "Insère une pause cosy dans le feed toutes les 20 posts. Aucune notification, jamais bloquante.",
  },
  {
    key: "author_diversity_enabled",
    icon: Layers,
    title: "Diversité des auteurs",
    desc: "Max 3 posts consécutifs du même auteur. Évite la bulle d'un seul compte qui inonde.",
  },
  {
    key: "signal_filter_enabled",
    icon: ShieldCheck,
    title: "Filtre signaux faibles",
    desc: "Rétrograde (sans censurer) les posts à réactions purement négatives (sad+surprised majoritaires).",
  },
];

export function FeedSettingsForm({ initial }: Props) {
  const [state, formAction] = useActionState(updateFeedSettings, INITIAL);
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Initial>(initial);

  useEffect(() => {
    if (state.status === "success") {
      toast.success("Réglages sauvegardés");
    } else if (state.status === "error") {
      toast.error(state.error ?? "Erreur lors de la sauvegarde");
    }
  }, [state]);

  function submit() {
    const fd = new FormData();
    if (values.anti_doomscroll_enabled) fd.set("anti_doomscroll_enabled", "on");
    if (values.author_diversity_enabled) fd.set("author_diversity_enabled", "on");
    if (values.signal_filter_enabled) fd.set("signal_filter_enabled", "on");
    fd.set("default_feed_mode", values.default_feed_mode);
    startTransition(() => formAction(fd));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white border border-line p-5 sm:p-6 space-y-4">
        <header>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-night-dim">
            · Garde-fous
          </p>
          <h2 className="mt-1 font-display text-[20px] sm:text-[22px] text-night">
            Les 3 garde-fous
          </h2>
        </header>

        <ul className="space-y-3">
          {GUARDRAILS.map((g) => {
            const Icon = g.icon;
            const on = values[g.key];
            return (
              <li
                key={g.key}
                className="flex items-start gap-3 p-3 rounded-2xl bg-bg-soft"
              >
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex w-9 h-9 rounded-xl items-center justify-center shrink-0",
                    on ? "bg-gold/15 text-gold-deep" : "bg-line text-night-dim",
                  )}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-extrabold text-night">
                    {g.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-night-soft leading-relaxed">
                    {g.desc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setValues({ ...values, [g.key]: !on })
                  }
                  role="switch"
                  aria-checked={on}
                  aria-label={`Activer ou désactiver : ${g.title}`}
                  className={cn(
                    "relative inline-flex w-11 h-6 rounded-full transition-colors shrink-0",
                    on ? "bg-gold-deep" : "bg-night/15",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-0.5 inline-block w-5 h-5 rounded-full bg-white shadow transition-transform",
                      on ? "translate-x-[22px]" : "translate-x-0.5",
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-3xl bg-white border border-line p-5 sm:p-6 space-y-4">
        <header>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-night-dim">
            <Sparkles className="inline-block w-3 h-3 mr-1" aria-hidden />
            · Mode par défaut
          </p>
          <h2 className="mt-1 font-display text-[20px] sm:text-[22px] text-night">
            Comment trier mon feed Transparent
          </h2>
          <p className="mt-1 text-[12px] text-night-soft">
            Ce mode est appliqué quand tu ouvres l&apos;onglet « Transparent »
            sans préciser de mode dans l&apos;URL.
          </p>
        </header>

        <ul className="space-y-1.5">
          {MODES.map((m) => {
            const active = values.default_feed_mode === m.id;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() =>
                    setValues({ ...values, default_feed_mode: m.id })
                  }
                  aria-pressed={active}
                  className={cn(
                    "w-full text-left flex items-center justify-between gap-3 p-3 rounded-2xl border transition-colors",
                    active
                      ? "border-gold-deep bg-gold/10"
                      : "border-line hover:border-night-dim/30",
                  )}
                >
                  <div>
                    <p className="text-[13.5px] font-extrabold text-night">
                      {m.label}
                    </p>
                    <p className="text-[11.5px] text-night-soft">{m.desc}</p>
                  </div>
                  {active ? (
                    <span
                      aria-hidden
                      className="inline-flex w-5 h-5 rounded-full bg-gold-deep text-white items-center justify-center text-[10px] font-extrabold"
                    >
                      ✓
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="sticky bottom-0 inset-x-0 -mx-4 sm:-mx-7 px-4 sm:px-7 py-3 bg-white/95 backdrop-blur-md border-t border-line flex items-center justify-between gap-3">
        <p className="text-[11px] text-night-dim">
          Tes réglages sont privés et appliqués immédiatement.
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className={cn(
            "inline-flex items-center gap-2 h-10 px-5 rounded-full text-[13px] font-extrabold transition-colors",
            pending
              ? "bg-bg-soft text-night-dim cursor-not-allowed"
              : "bg-night text-cream hover:bg-night-soft",
          )}
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Save className="w-3.5 h-3.5" aria-hidden />
          )}
          Enregistrer
        </button>
      </div>
    </div>
  );
}
