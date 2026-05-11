"use client";

import {
  Briefcase,
  GraduationCap,
  Loader2,
  Palette,
  Rocket,
  ShoppingBag,
  User,
  Users,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateFacets } from "@/app/(app)/profile/actions";
import { cn } from "@/lib/utils/cn";
import type { ProfileFacet } from "@/lib/database.types";

/* FacetsManager — toggle des 7 facettes + sélection primary_facet.
 *
 * 'particulier' toujours active (lock).
 * primary_facet doit être dans facets[] (validé côté action).
 *
 * UX :
 *   - Card par facette avec icon + description + toggle
 *   - Radio pour "facette principale" (mise en avant sur le profil)
 *   - Submit via Server Action updateFacets (FormData) */

type FacetDef = {
  id: ProfileFacet;
  label: string;
  description: string;
  icon: typeof User;
  locked?: boolean;
};

const FACETS: FacetDef[] = [
  {
    id: "particulier",
    label: "Particulier",
    description: "Visible par défaut. Toujours active.",
    icon: User,
    locked: true,
  },
  {
    id: "professionnel",
    label: "Professionnel",
    description: "Expériences, formation, compétences, recommandations.",
    icon: Briefcase,
  },
  {
    id: "createur",
    label: "Créateur",
    description: "Stats audience, contenus à la une, media kit.",
    icon: Palette,
  },
  {
    id: "vendeur",
    label: "Vendeur Marketplace",
    description: "Annonces, note vendeur, avis.",
    icon: ShoppingBag,
  },
  {
    id: "mentor",
    label: "Mentor",
    description: "Sujets de mentorat, tarifs, disponibilité, booking.",
    icon: GraduationCap,
  },
  {
    id: "recruteur",
    label: "Recruteur",
    description: "Entreprise représentée, offres ouvertes.",
    icon: Users,
  },
  {
    id: "entrepreneur",
    label: "Entrepreneur",
    description: "Sociétés fondées, portfolio invest, levée en cours.",
    icon: Rocket,
  },
];

type Props = {
  initialFacets: ProfileFacet[];
  initialPrimaryFacet: ProfileFacet;
};

export function FacetsManager({
  initialFacets,
  initialPrimaryFacet,
}: Props) {
  const [facets, setFacets] = useState<ProfileFacet[]>(initialFacets);
  const [primary, setPrimary] = useState<ProfileFacet>(initialPrimaryFacet);
  const [pending, startTransition] = useTransition();

  function toggleFacet(id: ProfileFacet) {
    if (id === "particulier") return; // locked
    setFacets((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((f) => f !== id);
        /* Si on dé-active la primary_facet, on retombe sur particulier. */
        if (primary === id) setPrimary("particulier");
        return next;
      }
      return [...prev, id];
    });
  }

  function setPrimaryFacet(id: ProfileFacet) {
    if (!facets.includes(id)) return; // doit être activé
    setPrimary(id);
  }

  function handleSave() {
    startTransition(async () => {
      const formData = new FormData();
      for (const f of facets) formData.append("facets", f);
      formData.set("primary_facet", primary);
      const res = await updateFacets(undefined, formData);
      if (res.status === "success") {
        toast.success(res.message ?? "Facettes mises à jour.");
      } else if (res.status === "error") {
        toast.error(res.message ?? "Erreur lors de la sauvegarde.");
      }
    });
  }

  const hasChanges =
    JSON.stringify([...facets].sort()) !==
      JSON.stringify([...initialFacets].sort()) || primary !== initialPrimaryFacet;

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-lg font-bold text-night">Tes facettes</h2>
        <p className="mt-1 text-[13px] text-night-muted">
          Active uniquement ce qui te concerne. Tes sections s&apos;affichent
          en conséquence sur ton profil public.
        </p>
      </header>

      <ul className="space-y-2.5">
        {FACETS.map(({ id, label, description, icon: Icon, locked }) => {
          const active = facets.includes(id);
          const isPrimary = primary === id;
          return (
            <li
              key={id}
              className={cn(
                "rounded-2xl border p-4 transition-colors",
                active
                  ? "border-gold-deep/50 bg-gold/5"
                  : "border-line bg-white",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    active
                      ? "bg-gold/15 text-gold-deep"
                      : "bg-night/5 text-night-muted",
                  )}
                >
                  <Icon className="w-5 h-5" aria-hidden />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-semibold text-night">
                      {label}
                    </p>
                    {locked ? (
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-night-dim">
                        Toujours active
                      </span>
                    ) : null}
                    {isPrimary ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gold-deep text-white text-[10.5px] font-bold uppercase tracking-wider">
                        Principale
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-night-muted">
                    {description}
                  </p>

                  {active && !isPrimary && !locked ? (
                    <button
                      type="button"
                      onClick={() => setPrimaryFacet(id)}
                      className="mt-2 text-[12px] font-semibold text-gold-deep hover:underline"
                    >
                      Définir comme principale
                    </button>
                  ) : null}
                </div>
                {!locked ? (
                  <button
                    type="button"
                    onClick={() => toggleFacet(id)}
                    aria-pressed={active}
                    aria-label={active ? `Désactiver ${label}` : `Activer ${label}`}
                    className={cn(
                      "relative inline-block w-11 h-6 rounded-full transition-colors shrink-0",
                      active ? "bg-gold-deep" : "bg-night/15",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                        active ? "translate-x-5" : "translate-x-0",
                      )}
                    />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-end gap-2 pt-2">
        {hasChanges ? (
          <span className="text-[12px] text-night-muted">
            Modifications non sauvegardées
          </span>
        ) : null}
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !hasChanges}
          className={cn(
            "h-10 px-5 rounded-full text-[13px] font-semibold transition-colors inline-flex items-center gap-1.5",
            pending || !hasChanges
              ? "bg-night/10 text-night-muted cursor-not-allowed"
              : "bg-night text-cream hover:bg-night-soft",
          )}
        >
          {pending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              Sauvegarde…
            </>
          ) : (
            "Enregistrer"
          )}
        </button>
      </div>
    </div>
  );
}
