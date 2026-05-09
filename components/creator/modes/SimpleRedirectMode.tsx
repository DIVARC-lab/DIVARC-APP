"use client";

import { ArrowRight, Briefcase, CalendarDays, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { CreatorMode } from "../CreatorProvider";
import { useCreator } from "../CreatorProvider";

/* SimpleRedirectMode — wrapper temporaire pour les modes listing/job/event.
 *
 * À l'étape 7, on n'inline pas encore les formulaires complets de
 * /marketplace/new, /jobs/new et /circles/[slug]/events/new (chacun fait
 * 200+ lignes avec photos, validations, RPCs spécifiques) — l'inline
 * complet sera fait dans une vague de polish ultérieure.
 *
 * Pour l'instant : le mode dans le modal présente un teaser cohérent
 * avec la grammaire Bold + un CTA qui ferme le modal et navigue vers
 * la route dédiée. La continuité UX est préservée (clic ⇒ flow complet),
 * la promesse "jamais de redirection" est tenue UNIQUEMENT pour post +
 * story qui sont les usages dominants (>90% de la création de contenu). */

const META: Record<
  Extract<CreatorMode, "listing" | "job" | "event">,
  {
    icon: typeof ShoppingBag;
    title: string;
    description: string;
    cta: string;
    href: string;
  }
> = {
  listing: {
    icon: ShoppingBag,
    title: "Vendre un objet",
    description:
      "Ajouter une annonce avec photos, description, prix, catégorie. Mise en ligne en 30 secondes.",
    cta: "Ouvrir le formulaire vendeur",
    href: "/marketplace/new",
  },
  job: {
    icon: Briefcase,
    title: "Publier une offre",
    description:
      "CDI, freelance, mission. Publication immédiate, candidatures gérées dans /jobs/mine.",
    cta: "Ouvrir le formulaire offre",
    href: "/jobs/new",
  },
  event: {
    icon: CalendarDays,
    title: "Créer un événement",
    description:
      "Atelier, meetup, soirée. À publier dans un de tes cercles — choisis le cercle dans le formulaire.",
    cta: "Choisir un cercle",
    href: "/circles",
  },
};

export function SimpleRedirectMode({
  mode,
}: {
  mode: "listing" | "job" | "event";
}) {
  const router = useRouter();
  const { close } = useCreator();
  const meta = META[mode];
  const Icon = meta.icon;

  function handleOpen() {
    close();
    router.push(meta.href);
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-16 text-center">
      <div
        aria-hidden
        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5"
      >
        <Icon className="w-9 h-9 text-gold-deep" aria-hidden />
      </div>
      <h3 className="font-display italic text-2xl text-night mb-2">
        {meta.title}
      </h3>
      <p className="text-sm text-night-muted max-w-md mb-6 leading-relaxed">
        {meta.description}
      </p>
      <Button onClick={handleOpen} size="lg" className="!h-12">
        {meta.cta}
        <ArrowRight className="w-4 h-4" aria-hidden />
      </Button>
    </div>
  );
}
