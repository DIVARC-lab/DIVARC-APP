"use client";

import {
  Award,
  BookOpen,
  Bookmark,
  Briefcase,
  Calendar,
  Camera,
  FileText,
  FolderOpen,
  GraduationCap,
  Heart,
  Loader2,
  Lock,
  MessageSquareQuote,
  Palette,
  Rocket,
  ShoppingBag,
  Trophy,
  User,
  Video,
  Zap,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateSectionsVisibility } from "@/app/(app)/profile/actions";
import { cn } from "@/lib/utils/cn";
import type { ProfileSectionVisibility } from "@/lib/database.types";

/* SectionsVisibilityPanel — éditeur privacy par section.
 *
 * Pour chaque section, l'user choisit qui peut la voir : public, friends,
 * friends_of_friends, private. La valeur sectionne_visibility jsonb est
 * un map { section_id: visibility } sur profiles.
 *
 * V1 : pas de mode "custom" (sélection users), arrive V2. */

type Visibility = "public" | "friends" | "friends_of_friends" | "private";

const SECTIONS: Array<{
  id: string;
  label: string;
  icon: typeof User;
  category: "social" | "professionnel" | "monétisation";
}> = [
  { id: "about", label: "À propos", icon: User, category: "social" },
  { id: "highlights", label: "Highlights", icon: Bookmark, category: "social" },
  { id: "photos", label: "Photos", icon: Camera, category: "social" },
  { id: "posts", label: "Posts", icon: FileText, category: "social" },
  {
    id: "experiences",
    label: "Expérience",
    icon: Briefcase,
    category: "professionnel",
  },
  {
    id: "education",
    label: "Formation",
    icon: GraduationCap,
    category: "professionnel",
  },
  {
    id: "skills",
    label: "Compétences",
    icon: Zap,
    category: "professionnel",
  },
  {
    id: "recommendations",
    label: "Recommandations",
    icon: MessageSquareQuote,
    category: "professionnel",
  },
  {
    id: "certifications",
    label: "Certifications",
    icon: Award,
    category: "professionnel",
  },
  {
    id: "projects",
    label: "Projets",
    icon: FolderOpen,
    category: "professionnel",
  },
  {
    id: "publications",
    label: "Publications",
    icon: BookOpen,
    category: "professionnel",
  },
  {
    id: "open_to_work",
    label: "Open to Work",
    icon: Calendar,
    category: "professionnel",
  },
  {
    id: "creator",
    label: "Stats créateur",
    icon: Palette,
    category: "monétisation",
  },
  {
    id: "marketplace",
    label: "Annonces vendeur",
    icon: ShoppingBag,
    category: "monétisation",
  },
  {
    id: "mentor",
    label: "Mentor",
    icon: GraduationCap,
    category: "monétisation",
  },
  {
    id: "entrepreneur",
    label: "Entrepreneur",
    icon: Rocket,
    category: "monétisation",
  },
  {
    id: "interests",
    label: "Centres d'intérêt",
    icon: Heart,
    category: "social",
  },
  { id: "badges", label: "Badges", icon: Trophy, category: "social" },
];

const VISIBILITY_OPTIONS: Array<{
  id: Visibility;
  label: string;
}> = [
  { id: "public", label: "🌐 Public" },
  { id: "friends", label: "👥 Relations" },
  { id: "friends_of_friends", label: "👥 Amis d'amis" },
  { id: "private", label: "🔒 Moi seul" },
];

const DEFAULT_VISIBILITY: Visibility = "public";

type Props = {
  initial: Record<string, ProfileSectionVisibility>;
};

export function SectionsVisibilityPanel({ initial }: Props) {
  const [values, setValues] = useState<Record<string, Visibility>>(() => {
    const out: Record<string, Visibility> = {};
    for (const k of Object.keys(initial)) {
      const v = initial[k];
      if (!v || v === "custom") continue; // skip custom (V2)
      out[k] = v;
    }
    return out;
  });
  const [pending, startTransition] = useTransition();

  function set(id: string, vis: Visibility) {
    setValues((prev) => ({ ...prev, [id]: vis }));
  }

  function handleSave() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("visibility", JSON.stringify(values));
      const res = await updateSectionsVisibility(undefined, formData);
      if (res.status === "success") {
        toast.success(res.message ?? "Visibilité enregistrée.");
      } else {
        toast.error(res.message ?? "Erreur.");
      }
    });
  }

  const grouped = {
    social: SECTIONS.filter((s) => s.category === "social"),
    professionnel: SECTIONS.filter((s) => s.category === "professionnel"),
    monétisation: SECTIONS.filter((s) => s.category === "monétisation"),
  };

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-bold text-night">Visibilité par section</h2>
        <p className="mt-1 text-[13px] text-night-muted">
          Définis qui peut voir chaque section de ton profil. Par défaut tout
          est public.
        </p>
      </header>

      {Object.entries(grouped).map(([category, sections]) => (
        <div key={category} className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-night-muted">
            {category}
          </h3>
          <ul className="rounded-2xl bg-white border border-line overflow-hidden divide-y divide-line">
            {sections.map(({ id, label, icon: Icon }) => {
              const current = values[id] ?? DEFAULT_VISIBILITY;
              return (
                <li key={id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      current === "private"
                        ? "bg-night/10 text-night-muted"
                        : "bg-gold/15 text-gold-deep",
                    )}
                  >
                    {current === "private" ? (
                      <Lock className="w-4 h-4" aria-hidden />
                    ) : (
                      <Icon className="w-4 h-4" aria-hidden />
                    )}
                  </span>
                  <span className="flex-1 min-w-0 text-[13.5px] font-semibold text-night">
                    {label}
                  </span>
                  <select
                    value={current}
                    onChange={(e) => set(id, e.target.value as Visibility)}
                    className="h-9 px-2 rounded-lg border border-line bg-white text-[12.5px] text-night focus:border-gold-deep focus:outline-none"
                  >
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="rounded-xl bg-bg-soft border border-line p-4">
        <p className="text-[12px] text-night-muted">
          ℹ️ V1 : les sections "vendeur", "mentor", "créateur", "entrepreneur"
          dépendent aussi des facettes activées. Si la facette est désactivée,
          la section reste cachée même si tu mets "Public".
        </p>
        <p className="mt-1 text-[12px] text-night-muted">
          🔜 V2 : visibilité "Personnalisée" pour sélectionner des
          utilisateurs/cercles spécifiques.
        </p>
      </div>

      <div className="flex justify-end pt-2 border-t border-line">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className={cn(
            "h-10 px-5 rounded-full text-[13px] font-semibold transition-colors inline-flex items-center gap-1.5",
            pending
              ? "bg-night/10 text-night-muted cursor-wait"
              : "bg-night text-cream hover:bg-night-soft",
          )}
        >
          {pending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              Enregistrement…
            </>
          ) : (
            "Enregistrer"
          )}
        </button>
      </div>
    </div>
  );
}

export const VISIBLE_SECTION_IDS = SECTIONS.map((s) => s.id);
