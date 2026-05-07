import {
  Award,
  Camera,
  CheckCircle2,
  Sparkles,
  UserPlus,
} from "lucide-react";
import type { Profile } from "@/lib/database.types";

type JournalEvent = {
  date: Date;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
  done: boolean;
};

export function JournalPanel({
  profile,
  signupDate,
}: {
  profile: Profile;
  signupDate: Date;
}) {
  const events: JournalEvent[] = [
    {
      date: signupDate,
      icon: UserPlus,
      iconBg: "bg-gold/15",
      iconColor: "text-gold-deep",
      title: "Inscription validée",
      body: profile.founder_rank
        ? `Tu es le fondateur n° ${profile.founder_rank} de DIVARC.`
        : "Tu fais partie des premiers membres.",
      done: true,
    },
    {
      date: signupDate,
      icon: Sparkles,
      iconBg: "bg-night/10",
      iconColor: "text-night",
      title: "Badge fondateur attribué",
      body: "Reconnu à vie sur ton profil DIVARC.",
      done: true,
    },
    {
      date: profile.updated_at ? new Date(profile.updated_at) : signupDate,
      icon: Camera,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-700",
      title: profile.avatar_url
        ? "Photo de profil ajoutée"
        : "Photo de profil à ajouter",
      body: profile.avatar_url
        ? "Ton avatar est visible partout sur DIVARC."
        : "Ajoute une photo pour personnaliser ton profil.",
      done: Boolean(profile.avatar_url),
    },
    {
      date: signupDate,
      icon: CheckCircle2,
      iconBg: "bg-night/10",
      iconColor: "text-night",
      title: profile.bio ? "Bio rédigée" : "Bio à compléter",
      body: profile.bio
        ? "Tes proches peuvent te découvrir."
        : "Une bio courte aide à te présenter.",
      done: Boolean(profile.bio),
    },
    {
      date: new Date("2099-01-01"),
      icon: Award,
      iconBg: "bg-cream",
      iconColor: "text-night",
      title: "Première discussion (à venir)",
      body: "Le premier message envoyé débloquera un badge spécial.",
      done: false,
    },
  ];

  return (
    <ol className="relative pl-6 sm:pl-8 space-y-7">
      <span
        aria-hidden
        className="absolute top-2 bottom-2 left-3 sm:left-4 w-px bg-line"
      />
      {events.map((event, idx) => {
        const Icon = event.icon;
        return (
          <li key={idx} className="relative">
            <span
              className={`absolute -left-1 sm:-left-0 top-0 w-7 h-7 rounded-full ${event.iconBg} ring-4 ring-bg flex items-center justify-center`}
              style={{ left: "-26px" }}
            >
              <Icon className={`w-3.5 h-3.5 ${event.iconColor}`} aria-hidden />
            </span>
            <div
              className={`p-5 rounded-2xl border ${
                event.done
                  ? "bg-white border-line"
                  : "bg-night/[0.02] border-dashed border-line"
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-night">{event.title}</h4>
                <time
                  dateTime={event.date.toISOString()}
                  className="text-xs text-muted shrink-0 ml-3"
                >
                  {event.done
                    ? event.date.toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "à venir"}
                </time>
              </div>
              <p className="mt-1 text-sm text-muted leading-relaxed">
                {event.body}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
