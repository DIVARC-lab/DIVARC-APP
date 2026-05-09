"use client";

import {
  Briefcase,
  CalendarDays,
  ImageIcon,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type CreatorMode, useCreator } from "@/components/creator/CreatorProvider";
import { cn } from "@/lib/utils/cn";

/* CreateOptions — orchestrateur client de la page /create.
 *
 * Au lieu de naviguer vers /feed, /marketplace/new, etc., chaque option
 * dispatch directement vers le ContentCreatorModal global via useCreator
 * (puis ferme la page /create en retournant au feed).
 *
 * /create reste comme route bookmarkable pour l'accès depuis l'extérieur
 * (deep link), mais l'expérience interne ne nécessite plus de navigation
 * pour créer du contenu. */

type Option = {
  mode: CreatorMode;
  label: string;
  sub: string;
  icon: typeof Sparkles;
  /** bg + text classes pour la tile. */
  tone: string;
  popular?: boolean;
};

const OPTIONS: Option[] = [
  {
    mode: "post",
    label: "Publier un post",
    sub: "Texte, photos, vidéo",
    icon: Sparkles,
    tone: "bg-night text-cream",
  },
  {
    mode: "listing",
    label: "Vendre un objet",
    sub: "Mise en ligne en 30 sec.",
    icon: ShoppingBag,
    tone: "bg-gold text-night",
    popular: true,
  },
  {
    mode: "job",
    label: "Publier une offre",
    sub: "CDI, freelance, mission",
    icon: Briefcase,
    tone: "bg-night text-cream",
  },
  {
    mode: "event",
    label: "Organiser un événement",
    sub: "Atelier, meetup, soirée",
    icon: CalendarDays,
    tone: "bg-night text-cream",
  },
  {
    mode: "story",
    label: "Story",
    sub: "Visible 24 h",
    icon: ImageIcon,
    tone: "bg-gold text-night",
  },
];

export function CreateOptions() {
  const router = useRouter();
  const { open } = useCreator();

  function handlePick(mode: CreatorMode) {
    /* On retourne au feed (la page /create est un hub modal-like, pas une
       destination de fond) puis on ouvre le modal universel. Permet au user
       de voir le contexte par-dessus lequel il crée son contenu. */
    router.push("/feed");
    /* Microtask pour laisser la navigation se déclencher avant l'ouverture
       du modal — sinon le modal s'affiche puis disparaît avec /create. */
    setTimeout(() => open({ mode }), 50);
  }

  return (
    <ul className="space-y-2">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        return (
          <li key={option.mode}>
            <button
              type="button"
              onClick={() => handlePick(option.mode)}
              className={cn(
                "flex items-center gap-3 p-3.5 rounded-2xl bg-white border transition-colors hover:border-gold/40 w-full text-left",
                option.popular
                  ? "border-gold/40 ring-2 ring-gold/15"
                  : "border-line",
              )}
            >
              <span
                className={cn(
                  "shrink-0 w-11 h-11 rounded-xl flex items-center justify-center",
                  option.tone,
                )}
              >
                <Icon className="w-4 h-4" aria-hidden />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-night truncate">
                    {option.label}
                  </p>
                  {option.popular ? (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-cream text-gold-deep tracking-[0.06em] border border-gold/30">
                      POPULAIRE
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted truncate">{option.sub}</p>
              </div>
              <span
                aria-hidden
                className="w-7 h-7 rounded-full bg-night/[0.04] flex items-center justify-center text-night-muted shrink-0"
              >
                →
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
