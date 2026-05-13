import { Crown, Medal, Sparkles, Trophy } from "lucide-react";
import type { CircleAmbassadorReward } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";

type Props = {
  reward: CircleAmbassadorReward | null;
  circleName: string;
};

const TIERS: {
  key: "connector" | "ambassador" | "champion" | "cofounder";
  threshold: number;
  label: string;
  icon: typeof Medal;
  color: string;
  perk: string;
}[] = [
  {
    key: "connector",
    threshold: 5,
    label: "Connecteur",
    icon: Medal,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    perk: "Badge visible sur ton profil membre",
  },
  {
    key: "ambassador",
    threshold: 10,
    label: "Ambassadeur",
    icon: Sparkles,
    color: "bg-gold/15 text-gold-deep border-gold/30",
    perk: "Badge gold + mise en avant dans le cercle",
  },
  {
    key: "champion",
    threshold: 25,
    label: "Champion",
    icon: Trophy,
    color: "bg-violet-50 text-violet-700 border-violet-200",
    perk: "Featured dans la liste des membres",
  },
  {
    key: "cofounder",
    threshold: 50,
    label: "Co-fondateur",
    icon: Crown,
    color: "bg-night text-cream border-night",
    perk: "Peut être nommé modérateur automatiquement",
  },
];

export function AmbassadorProgress({ reward, circleName }: Props) {
  const accepted = reward?.invitations_accepted ?? 0;
  const currentTier = TIERS.slice()
    .reverse()
    .find((t) => accepted >= t.threshold);
  const nextTier = TIERS.find((t) => accepted < t.threshold);
  const progressToNext = nextTier
    ? Math.min((accepted / nextTier.threshold) * 100, 100)
    : 100;

  return (
    <section className="mb-6 rounded-2xl bg-white border border-line p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
            · Ambassadeur de {circleName}
          </p>
          <p className="mt-1 font-display italic text-[22px] text-night leading-tight">
            {accepted}{" "}
            <span className="text-night-dim text-[13px] not-italic font-normal">
              invité{accepted > 1 ? "s" : ""} acceptés
            </span>
          </p>
        </div>
        {currentTier ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-[11px] font-extrabold",
              currentTier.color,
            )}
          >
            <currentTier.icon className="w-3.5 h-3.5" aria-hidden />
            {currentTier.label}
          </span>
        ) : null}
      </div>

      {/* Barre de progression vers le prochain palier. */}
      {nextTier ? (
        <>
          <div className="relative h-2 rounded-full bg-bg-soft overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold to-gold-deep"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-night-dim text-center">
            Plus que{" "}
            <strong className="text-gold-deep tabular-nums">
              {nextTier.threshold - accepted}
            </strong>{" "}
            invité{nextTier.threshold - accepted > 1 ? "s" : ""} acceptés pour
            débloquer{" "}
            <strong className="text-night">{nextTier.label}</strong>
          </p>
        </>
      ) : (
        <p className="text-[12px] text-gold-deep text-center font-bold">
          🎉 Tous les paliers débloqués. Tu es un pilier de {circleName}.
        </p>
      )}

      {/* Tiers à débloquer */}
      <ul className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TIERS.map((tier) => {
          const unlocked = accepted >= tier.threshold;
          const Icon = tier.icon;
          return (
            <li
              key={tier.key}
              className={cn(
                "rounded-xl border p-2.5 text-center transition-opacity",
                unlocked ? tier.color : "bg-bg-soft border-line opacity-50",
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 mx-auto mb-1",
                  unlocked ? "" : "text-night-dim",
                )}
                aria-hidden
              />
              <p className="text-[11px] font-extrabold">{tier.label}</p>
              <p
                className={cn(
                  "text-[9.5px] tabular-nums mt-0.5",
                  unlocked ? "" : "text-night-dim",
                )}
              >
                {tier.threshold} invités
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
