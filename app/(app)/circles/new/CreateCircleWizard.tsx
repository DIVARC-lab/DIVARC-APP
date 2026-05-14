"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Loader2,
  Lock,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  CIRCLE_CATEGORIES,
  listAvailableCircleCategories,
} from "@/lib/circles/categories";
import { cn } from "@/lib/utils/cn";
import { createCircleV2 } from "../actions";

type Step = "identity" | "context" | "modules" | "access" | "rules";

const STEPS: { key: Step; label: string }[] = [
  { key: "identity", label: "Identité" },
  { key: "context", label: "Description" },
  { key: "modules", label: "Modules" },
  { key: "access", label: "Accès" },
  { key: "rules", label: "Règles" },
];

const COLOR_PRESETS = [
  { value: "#C9A961", label: "Gold" },
  { value: "#0A1F44", label: "Navy" },
  { value: "#10B981", label: "Emerald" },
  { value: "#F43F5E", label: "Rose" },
  { value: "#8B5CF6", label: "Violet" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#0EA5E9", label: "Sky" },
  { value: "#EC4899", label: "Pink" },
];

type State = {
  name: string;
  tagline: string;
  emoji: string;
  color_accent: string;
  description: string;
  primary_category: string;
  tags: string[];
  language: string;
  is_local: boolean;
  location_city: string;
  location_country: string;
  modules: {
    social_feed: boolean;
    marketplace: boolean;
    jobs: boolean;
    library: boolean;
    events: boolean;
    polls: boolean;
    wiki: boolean;
    live_audio: boolean;
    challenges: boolean;
    mentorship: boolean;
  };
  type: "open" | "semi_open" | "private" | "hidden";
  join_policy:
    | "instant"
    | "request"
    | "invite_only"
    | "paid"
    | "quiz";
  visibility: "public" | "unlisted" | "invite_only";
  welcome_message: string;
  rules: { title: string; description: string; is_critical: boolean }[];
};

export function CreateCircleWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<State>({
    name: "",
    tagline: "",
    emoji: "🏠",
    color_accent: "#C9A961",
    description: "",
    primary_category: "",
    tags: [],
    language: "fr",
    is_local: false,
    location_city: "",
    location_country: "FR",
    modules: {
      social_feed: true,
      marketplace: false,
      jobs: false,
      library: false,
      events: true,
      polls: true,
      wiki: false,
      live_audio: false,
      challenges: false,
      mentorship: false,
    },
    type: "open",
    join_policy: "instant",
    visibility: "public",
    welcome_message: "",
    rules: [],
  });

  const current = STEPS[stepIndex]!.key;

  function canAdvance(): boolean {
    switch (current) {
      case "identity":
        return data.name.trim().length >= 2;
      case "context":
        return data.primary_category !== "";
      case "modules":
        return true;
      case "access":
        return true;
      case "rules":
        return false;
      default:
        return false;
    }
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function goPrev() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function submit() {
    startTransition(async () => {
      const result = await createCircleV2({
        ...data,
        rules: data.rules.filter((r) => r.title.trim().length > 0),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cercle créé ! Bienvenue chez toi.");
      router.push(`/circles/${result.slug}`);
    });
  }

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <ol className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <li
            key={s.key}
            className={cn(
              "flex-1 h-1.5 rounded-full transition-colors",
              i < stepIndex ? "bg-gold" : i === stepIndex ? "bg-night" : "bg-line",
            )}
            aria-current={i === stepIndex ? "step" : undefined}
            aria-label={`Étape ${i + 1} : ${s.label}`}
          />
        ))}
      </ol>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
        · Étape {stepIndex + 1} / {STEPS.length} — {STEPS[stepIndex]!.label}
      </p>

      {/* Step content */}
      <div className="rounded-3xl bg-white border border-line p-5 sm:p-7">
        {current === "identity" ? (
          <StepIdentity data={data} setData={setData} />
        ) : null}
        {current === "context" ? (
          <StepContext data={data} setData={setData} />
        ) : null}
        {current === "modules" ? (
          <StepModules data={data} setData={setData} />
        ) : null}
        {current === "access" ? (
          <StepAccess data={data} setData={setData} />
        ) : null}
        {current === "rules" ? (
          <StepRules data={data} setData={setData} />
        ) : null}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={stepIndex === 0 || pending}
          className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-white border border-line text-night text-[13px] font-bold hover:border-night/30 transition-colors disabled:opacity-30 disabled:hover:border-line"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Retour
        </button>
        {current === "rules" ? (
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-gradient-to-br from-gold to-gold-deep text-night text-[13px] font-extrabold shadow-[0_8px_22px_-8px_rgba(244,185,66,0.55)] hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Check className="w-4 h-4" aria-hidden />
            )}
            {pending ? "Création…" : "Créer le cercle"}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvance() || pending}
            className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-night text-cream text-[13px] font-bold hover:bg-night-soft transition-colors disabled:opacity-40"
          >
            Continuer
            <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
 * Étape 1 — Identité
 * ============================================================================ */

function StepIdentity({
  data,
  setData,
}: {
  data: State;
  setData: React.Dispatch<React.SetStateAction<State>>;
}) {
  return (
    <div>
      <h2 className="font-display italic text-[22px] text-night mb-1">
        Identité
      </h2>
      <p className="text-[12px] text-night-dim mb-4">
        Un nom, une tagline courte, une couleur. Ce qui rend ton cercle
        reconnaissable.
      </p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="circle-name" required>
            Nom du cercle
          </Label>
          <Input
            id="circle-name"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            placeholder="Ex: Tech entrepreneurs Paris"
            maxLength={80}
          />
        </div>

        <div>
          <Label htmlFor="circle-tagline">Tagline (max 140 caractères)</Label>
          <Input
            id="circle-tagline"
            value={data.tagline}
            onChange={(e) =>
              setData({ ...data, tagline: e.target.value })
            }
            placeholder="Un slogan court qui décrit ton cercle"
            maxLength={140}
          />
          <p className="mt-1 text-[10px] text-night-dim text-right tabular-nums">
            {data.tagline.length} / 140
          </p>
        </div>

        <div>
          <Label htmlFor="circle-emoji">Emoji avatar</Label>
          <Input
            id="circle-emoji"
            value={data.emoji}
            onChange={(e) =>
              setData({ ...data, emoji: e.target.value.slice(0, 8) })
            }
            placeholder="🏠"
            className="w-24 text-center text-2xl"
          />
        </div>

        <div>
          <Label>Couleur d&apos;accent</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {COLOR_PRESETS.map((c) => {
              const active = data.color_accent === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setData({ ...data, color_accent: c.value })}
                  aria-label={c.label}
                  aria-pressed={active}
                  className={cn(
                    "w-10 h-10 rounded-full transition-all",
                    active && "ring-4 ring-offset-2 ring-night",
                  )}
                  style={{ backgroundColor: c.value }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * Étape 2 — Description & catégorie
 * ============================================================================ */

function StepContext({
  data,
  setData,
}: {
  data: State;
  setData: React.Dispatch<React.SetStateAction<State>>;
}) {
  const [tagInput, setTagInput] = useState("");
  const categories = listAvailableCircleCategories();

  function addTag() {
    const v = tagInput
      .trim()
      .replace(/[^a-z0-9-]/gi, "")
      .toLowerCase();
    if (!v || data.tags.includes(v) || data.tags.length >= 10) {
      setTagInput("");
      return;
    }
    setData({ ...data, tags: [...data.tags, v] });
    setTagInput("");
  }

  function removeTag(t: string) {
    setData({ ...data, tags: data.tags.filter((x) => x !== t) });
  }

  return (
    <div>
      <h2 className="font-display italic text-[22px] text-night mb-1">
        Description & contexte
      </h2>
      <p className="text-[12px] text-night-dim mb-4">
        Décris ton cercle pour que les bonnes personnes le trouvent.
      </p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="circle-desc">Description</Label>
          <Textarea
            id="circle-desc"
            value={data.description}
            onChange={(e) =>
              setData({ ...data, description: e.target.value })
            }
            rows={5}
            maxLength={4000}
            placeholder="Pourquoi ce cercle existe, à qui il s'adresse…"
          />
        </div>

        <div>
          <Label required>Catégorie principale</Label>
          <Select
            value={data.primary_category}
            onChange={(e) =>
              setData({ ...data, primary_category: e.target.value })
            }
          >
            <option value="">— Choisir une catégorie —</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label} — {cat.description}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="circle-tags">
            Tags (max 10) — sans #
          </Label>
          <div className="flex gap-2">
            <Input
              id="circle-tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="ex: startup, saas, b2b"
              maxLength={40}
              disabled={data.tags.length >= 10}
            />
            <button
              type="button"
              onClick={addTag}
              disabled={data.tags.length >= 10}
              className="h-10 px-3 rounded-xl bg-night text-cream text-[12px] font-bold disabled:opacity-50"
            >
              Ajouter
            </button>
          </div>
          {data.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 h-6 pl-2.5 pr-1 rounded-full bg-bg-soft text-[11px] font-bold text-night"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    aria-label={`Retirer ${t}`}
                    className="w-4 h-4 rounded-full hover:bg-line inline-flex items-center justify-center"
                  >
                    <X className="w-3 h-3" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <Label>
            <input
              type="checkbox"
              checked={data.is_local}
              onChange={(e) =>
                setData({ ...data, is_local: e.target.checked })
              }
              className="w-4 h-4 accent-gold-deep mr-2"
            />
            Cercle local (géolocalisé)
          </Label>
          {data.is_local ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Input
                value={data.location_city}
                onChange={(e) =>
                  setData({ ...data, location_city: e.target.value })
                }
                placeholder="Ville"
                maxLength={80}
              />
              <Input
                value={data.location_country}
                onChange={(e) =>
                  setData({
                    ...data,
                    location_country: e.target.value.toUpperCase().slice(0, 2),
                  })
                }
                placeholder="FR"
                maxLength={2}
                className="text-center uppercase"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * Étape 3 — Modules
 * ============================================================================ */

const MODULES_META: Array<{
  key: keyof State["modules"];
  label: string;
  desc: string;
  alwaysOn?: boolean;
  comingSoon?: boolean;
}> = [
  {
    key: "social_feed",
    label: "Fil social",
    desc: "Posts, discussions, sondages — toujours activé",
    alwaysOn: true,
  },
  {
    key: "events",
    label: "Événements",
    desc: "Meetups, webinaires, RSVP avec types in-person/online/hybrid",
  },
  {
    key: "polls",
    label: "Sondages",
    desc: "Vote rapide intégré dans les posts",
  },
  {
    key: "marketplace",
    label: "Marketplace",
    desc: "Annonces thématiques entre membres",
  },
  {
    key: "jobs",
    label: "Job board",
    desc: "Offres d'emploi et missions — gratuit pour les membres",
  },
  {
    key: "library",
    label: "Bibliothèque",
    desc: "Ressources curées : articles, vidéos, templates, wikis",
  },
  {
    key: "wiki",
    label: "Wiki collaboratif",
    desc: "Base de connaissances éditable dans la Bibliothèque",
  },
  {
    key: "mentorship",
    label: "Mentorat",
    desc: "Membres mentors qui se déclarent pour accompagner les autres",
  },
];

function StepModules({
  data,
  setData,
}: {
  data: State;
  setData: React.Dispatch<React.SetStateAction<State>>;
}) {
  return (
    <div>
      <h2 className="font-display italic text-[22px] text-night mb-1">
        Modules à activer
      </h2>
      <p className="text-[12px] text-night-dim mb-4">
        Choisis ce que les membres pourront faire dans ton cercle. Tu pourras
        modifier plus tard.
      </p>

      <div className="space-y-2">
        {MODULES_META.map((mod) => {
          const checked = data.modules[mod.key];
          const disabled = mod.alwaysOn || mod.comingSoon;
          return (
            <label
              key={mod.key}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer",
                checked
                  ? "bg-gold/5 border-gold/30"
                  : "bg-white border-line hover:border-night/30",
                disabled && "opacity-60 cursor-not-allowed",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) =>
                  setData({
                    ...data,
                    modules: {
                      ...data.modules,
                      [mod.key]: e.target.checked,
                    },
                  })
                }
                className="mt-0.5 w-4 h-4 accent-gold-deep"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold text-night">
                  {mod.label}
                  {mod.alwaysOn ? (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-gold-deep">
                      · Inclus
                    </span>
                  ) : null}
                  {mod.comingSoon ? (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-night-dim">
                      · Bientôt
                    </span>
                  ) : null}
                </p>
                <p className="text-[11.5px] text-night-dim leading-snug">
                  {mod.desc}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
 * Étape 4 — Accès & visibilité
 * ============================================================================ */

const TYPE_META: Array<{
  value: State["type"];
  label: string;
  desc: string;
  icon: typeof Globe;
}> = [
  {
    value: "open",
    label: "Ouvert",
    desc: "Tout le monde voit le contenu et peut rejoindre librement.",
    icon: Globe,
  },
  {
    value: "semi_open",
    label: "Semi-ouvert",
    desc: "Visible publiquement, mais l'adhésion nécessite une approbation.",
    icon: Globe,
  },
  {
    value: "private",
    label: "Privé",
    desc: "Cercle visible mais contenu réservé aux membres approuvés.",
    icon: Lock,
  },
  {
    value: "hidden",
    label: "Caché",
    desc: "Invisible sauf si invité. Pour les groupes très privés.",
    icon: Lock,
  },
];

function StepAccess({
  data,
  setData,
}: {
  data: State;
  setData: React.Dispatch<React.SetStateAction<State>>;
}) {
  /* Ajuste join_policy + visibility automatiquement selon le type. */
  function selectType(t: State["type"]) {
    const derivedPolicy: State["join_policy"] =
      t === "open" ? "instant" : t === "semi_open" ? "request" : "invite_only";
    const derivedVisibility: State["visibility"] =
      t === "hidden" ? "invite_only" : "public";
    setData({
      ...data,
      type: t,
      join_policy: derivedPolicy,
      visibility: derivedVisibility,
    });
  }

  return (
    <div>
      <h2 className="font-display italic text-[22px] text-night mb-1">
        Accès & visibilité
      </h2>
      <p className="text-[12px] text-night-dim mb-4">
        Qui peut voir et rejoindre ton cercle ? Modifiable plus tard.
      </p>

      <div className="space-y-2">
        {TYPE_META.map((opt) => {
          const active = data.type === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => selectType(opt.value)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors",
                active
                  ? "bg-night text-cream border-night"
                  : "bg-white border-line hover:border-night/30",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-flex w-8 h-8 rounded-lg items-center justify-center shrink-0",
                  active ? "bg-cream/15 text-cream" : "bg-bg-soft text-night",
                )}
              >
                <Icon className="w-4 h-4" aria-hidden />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold">{opt.label}</p>
                <p
                  className={cn(
                    "text-[12px] leading-snug mt-0.5",
                    active ? "text-cream/80" : "text-night-dim",
                  )}
                >
                  {opt.desc}
                </p>
              </div>
              {active ? (
                <Check className="w-4 h-4 shrink-0" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
 * Étape 5 — Règles & finalisation
 * ============================================================================ */

function StepRules({
  data,
  setData,
}: {
  data: State;
  setData: React.Dispatch<React.SetStateAction<State>>;
}) {
  function addRule() {
    if (data.rules.length >= 15) return;
    setData({
      ...data,
      rules: [
        ...data.rules,
        { title: "", description: "", is_critical: false },
      ],
    });
  }

  function updateRule(i: number, patch: Partial<State["rules"][0]>) {
    const next = [...data.rules];
    next[i] = { ...next[i]!, ...patch };
    setData({ ...data, rules: next });
  }

  function removeRule(i: number) {
    setData({ ...data, rules: data.rules.filter((_, j) => j !== i) });
  }

  return (
    <div>
      <h2 className="font-display italic text-[22px] text-night mb-1">
        Règles & bienvenue
      </h2>
      <p className="text-[12px] text-night-dim mb-4">
        Pose les règles claires dès le début (max 15). Optionnel mais
        recommandé.
      </p>

      <div className="space-y-3">
        {data.rules.map((rule, i) => (
          <div
            key={i}
            className="rounded-xl bg-bg-soft border border-line p-3 space-y-2"
          >
            <div className="flex items-baseline gap-2">
              <span className="inline-flex w-6 h-6 rounded-md bg-night text-cream items-center justify-center text-[11px] font-extrabold shrink-0">
                {i + 1}
              </span>
              <Input
                value={rule.title}
                onChange={(e) => updateRule(i, { title: e.target.value })}
                placeholder="Titre de la règle"
                maxLength={60}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeRule(i)}
                aria-label="Supprimer cette règle"
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-error-bg text-night-dim hover:text-error transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden />
              </button>
            </div>
            <Textarea
              value={rule.description}
              onChange={(e) =>
                updateRule(i, { description: e.target.value })
              }
              rows={2}
              maxLength={300}
              placeholder="Description (optionnel)"
            />
            <label className="inline-flex items-center gap-2 text-[11px] text-night-dim cursor-pointer">
              <input
                type="checkbox"
                checked={rule.is_critical}
                onChange={(e) =>
                  updateRule(i, { is_critical: e.target.checked })
                }
                className="w-3.5 h-3.5 accent-red-600"
              />
              Règle critique (violation = sanction immédiate)
            </label>
          </div>
        ))}

        {data.rules.length < 15 ? (
          <button
            type="button"
            onClick={addRule}
            className="w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-xl border border-dashed border-line text-night-dim text-[12px] font-bold hover:border-night/30 hover:text-night transition-colors"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden />
            Ajouter une règle ({data.rules.length}/15)
          </button>
        ) : null}

        <div>
          <Label htmlFor="welcome-msg">
            Message de bienvenue
          </Label>
          <Textarea
            id="welcome-msg"
            value={data.welcome_message}
            onChange={(e) =>
              setData({ ...data, welcome_message: e.target.value })
            }
            rows={3}
            maxLength={1000}
            placeholder="Affiché aux nouveaux membres dès leur arrivée."
          />
        </div>

        {/* Récap mini */}
        <div className="mt-4 p-3 rounded-xl bg-night text-cream">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gold">
            <Sparkles className="inline w-3 h-3 mr-1" aria-hidden />
            Récap
          </p>
          <ul className="mt-1.5 text-[12px] space-y-0.5 text-cream/90">
            <li>
              <strong>{data.name}</strong>
              {data.tagline ? ` — ${data.tagline}` : ""}
            </li>
            <li>
              {TYPE_META.find((t) => t.value === data.type)?.label} ·{" "}
              {Object.values(data.modules).filter(Boolean).length} modules
              activés
            </li>
            <li>
              {data.rules.length} règle
              {data.rules.length > 1 ? "s" : ""} ·{" "}
              {data.tags.length} tag
              {data.tags.length > 1 ? "s" : ""}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Label({
  children,
  htmlFor,
  required,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[12px] font-bold text-night mb-1.5"
    >
      {children}
      {required ? (
        <span className="text-error ml-0.5" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}
