"use client";

/* Étape 4 — Form création live généralisé.
 *
 * 5 sections : Informations / Visibilité / Chat & modération /
 * Monétisation / Replay. Style DIVARC (cards, navy/gold/cream).
 *
 * Submit → createLiveStreamSession → redirect /lives/[id]/studio
 * (le studio sera implémenté étape 5).
 */

import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Mic,
  Radio,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type {
  AutoModLevel,
  LiveCategory,
  LiveVisibility,
} from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { createLiveStreamSession } from "../actions";

type Props = {
  presetCircle: { id: string; name: string; slug: string } | null;
};

const CATEGORIES: { value: LiveCategory; label: string }[] = [
  { value: "just_chatting", label: "Conversations" },
  { value: "gaming", label: "Gaming" },
  { value: "music", label: "Musique" },
  { value: "art", label: "Art & Création" },
  { value: "cooking", label: "Cuisine" },
  { value: "sports", label: "Sport" },
  { value: "education", label: "Apprentissage" },
  { value: "news", label: "Actualités" },
  { value: "tech", label: "Tech" },
  { value: "business", label: "Business" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "beauty", label: "Beauté" },
  { value: "fashion", label: "Mode" },
  { value: "travel", label: "Voyage" },
  { value: "fitness", label: "Fitness" },
  { value: "asmr", label: "ASMR" },
  { value: "podcast", label: "Podcast" },
  { value: "interview", label: "Interview" },
  { value: "event", label: "Événement" },
  { value: "q_and_a", label: "Q & R" },
];

const VISIBILITIES: {
  value: LiveVisibility;
  label: string;
  desc: string;
}[] = [
  {
    value: "public",
    label: "Public",
    desc: "Tout le monde sur DIVARC peut découvrir et regarder.",
  },
  {
    value: "unlisted",
    label: "Non répertorié",
    desc: "Visible uniquement avec le lien direct.",
  },
  {
    value: "friends_only",
    label: "Amis uniquement",
    desc: "Seules tes amitiés acceptées peuvent regarder.",
  },
  {
    value: "circle",
    label: "Un cercle",
    desc: "Réservé aux membres d'un cercle (à sélectionner).",
  },
  {
    value: "subscribers_only",
    label: "Abonnés uniquement",
    desc: "Réservé aux abonnés de ta chaîne (V2 si pas encore connecté).",
  },
  {
    value: "private",
    label: "Privé (test)",
    desc: "Seulement toi peux voir. Utile pour tester avant un live public.",
  },
];

const AUTO_MOD_LEVELS: {
  value: AutoModLevel;
  label: string;
  desc: string;
}[] = [
  { value: "off", label: "Désactivée", desc: "Aucun filtrage." },
  { value: "low", label: "Légère", desc: "Filtre spam évident uniquement." },
  {
    value: "medium",
    label: "Moyenne (recommandée)",
    desc: "Filtre spam + insultes graves + harcèlement.",
  },
  {
    value: "high",
    label: "Stricte",
    desc: "Filtre tout contenu sensible et ciblé.",
  },
  {
    value: "strict",
    label: "Très stricte",
    desc: "Filtre même les gros mots non-ciblés.",
  },
];

export function NewLiveForm({ presetCircle }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [advanced, setAdvanced] = useState(false);

  /* Champs principaux */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"audio" | "video">("video");
  const [category, setCategory] = useState<LiveCategory | "">("");
  const [tagsInput, setTagsInput] = useState("");
  const [visibility, setVisibility] = useState<LiveVisibility>(
    presetCircle ? "circle" : "public",
  );
  const [language] = useState("fr");

  /* Chat config */
  const [chatEnabled, setChatEnabled] = useState(true);
  const [chatSlowMode, setChatSlowMode] = useState(0);
  const [autoMod, setAutoMod] = useState<AutoModLevel>("medium");

  /* Monétisation */
  const [superChat, setSuperChat] = useState(true);
  const [gifts, setGifts] = useState(true);
  const [tips, setTips] = useState(true);

  /* Replay */
  const [isRecording, setIsRecording] = useState(true);

  function parseTags(): string[] {
    return tagsInput
      .split(/[,\n]/)
      .map((t) => t.trim().replace(/^#/, ""))
      .filter((t) => t.length > 0 && t.length <= 30)
      .slice(0, 10);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (title.trim().length < 3) {
      toast.error("Le titre doit faire au moins 3 caractères.");
      return;
    }
    if (visibility === "circle" && !presetCircle) {
      toast.error(
        "Pour une visibilité « cercle », ouvre cette page depuis un cercle.",
      );
      return;
    }
    startTransition(async () => {
      const res = await createLiveStreamSession({
        title: title.trim(),
        description: description.trim(),
        kind,
        category: category || undefined,
        tags: parseTags(),
        language,
        visibility,
        circle_id: visibility === "circle" ? presetCircle?.id ?? null : null,
        chat_enabled: chatEnabled,
        chat_followers_only: false,
        chat_subscribers_only: false,
        chat_slow_mode_seconds: chatSlowMode,
        chat_emote_only: false,
        auto_mod_level: autoMod,
        is_super_chat_enabled: superChat,
        is_virtual_gifts_enabled: gifts,
        is_tips_enabled: tips,
        is_subscribers_only_stream: false,
        is_recording: isRecording,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Live créé ! Direction le studio.");
      /* Le studio sera implémenté étape 5 — fallback temporaire :
         redirige vers la page viewer si studio absent. */
      router.push(`/lives/${res.id}/studio`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* === Section 1 : Informations === */}
      <section className="rounded-3xl bg-white border border-line p-5 sm:p-6 shadow-soft space-y-4">
        <SectionTitle>Informations</SectionTitle>

        <Field id="title" label="Titre" required>
          <input
            id="title"
            type="text"
            required
            minLength={3}
            maxLength={140}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre captivant de ton live…"
            className="w-full h-11 px-3 rounded-xl border border-line text-[14px] focus:outline-none focus:border-night/30"
          />
          <Hint>{title.length}/140 caractères.</Hint>
        </Field>

        <Field id="description" label="Description">
          <textarea
            id="description"
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="De quoi tu vas parler ? (optionnel)"
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-line text-[14px] resize-none focus:outline-none focus:border-night/30"
          />
        </Field>

        {/* Kind audio/video — groupe de boutons custom, pas un input. */}
        <Field id="kind" label="Format" required asGroup>
          <div className="grid grid-cols-2 gap-2">
            <KindOption
              label="Vidéo"
              icon={Video}
              active={kind === "video"}
              onClick={() => setKind("video")}
            />
            <KindOption
              label="Audio uniquement"
              icon={Mic}
              active={kind === "audio"}
              onClick={() => setKind("audio")}
            />
          </div>
        </Field>

        <Field id="category" label="Catégorie">
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as LiveCategory)}
            className="w-full h-11 px-3 rounded-xl border border-line text-[14px] bg-white focus:outline-none focus:border-night/30"
          >
            <option value="">— Choisir une catégorie —</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id="tags" label="Tags (max 10, séparés par virgules)">
          <input
            id="tags"
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="dev, paris, IA, startup..."
            className="w-full h-11 px-3 rounded-xl border border-line text-[14px] focus:outline-none focus:border-night/30"
          />
          <Hint>{parseTags().length}/10 tags.</Hint>
        </Field>
      </section>

      {/* === Section 2 : Visibilité === */}
      <section className="rounded-3xl bg-white border border-line p-5 sm:p-6 shadow-soft space-y-3">
        <SectionTitle>Visibilité</SectionTitle>

        {presetCircle ? (
          <div className="rounded-2xl bg-gold/10 border border-gold/30 p-3 text-[12.5px] text-night leading-relaxed">
            Tu pars depuis le cercle{" "}
            <span className="font-bold">{presetCircle.name}</span>. Visibilité
            « cercle » pré-sélectionnée.
          </div>
        ) : null}

        <div className="space-y-2">
          {VISIBILITIES.filter(
            (v) => v.value !== "circle" || presetCircle !== null,
          ).map((v) => (
            <VisibilityOption
              key={v.value}
              label={v.label}
              desc={v.desc}
              active={visibility === v.value}
              onClick={() => setVisibility(v.value)}
            />
          ))}
        </div>
      </section>

      {/* === Section 3 : Chat & modération === */}
      <section className="rounded-3xl bg-white border border-line p-5 sm:p-6 shadow-soft space-y-4">
        <SectionTitle>Chat & modération</SectionTitle>

        <ToggleRow
          label="Chat activé"
          desc="Les viewers peuvent envoyer des messages pendant ton live."
          checked={chatEnabled}
          onChange={setChatEnabled}
        />

        {chatEnabled ? (
          <>
            <Field id="slow_mode" label={`Mode lent · ${chatSlowMode}s`}>
              <input
                id="slow_mode"
                type="range"
                min={0}
                max={120}
                step={5}
                value={chatSlowMode}
                onChange={(e) => setChatSlowMode(Number(e.target.value))}
                className="w-full accent-gold-deep"
              />
              <Hint>
                Délai minimal entre 2 messages d&apos;un même viewer.
                0 = désactivé.
              </Hint>
            </Field>

            <Field id="auto_mod" label="Modération automatique IA">
              <select
                id="auto_mod"
                value={autoMod}
                onChange={(e) => setAutoMod(e.target.value as AutoModLevel)}
                className="w-full h-11 px-3 rounded-xl border border-line text-[14px] bg-white focus:outline-none focus:border-night/30"
              >
                {AUTO_MOD_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label} — {l.desc}
                  </option>
                ))}
              </select>
            </Field>
          </>
        ) : null}
      </section>

      {/* === Section 4 : Monétisation === */}
      <section className="rounded-3xl bg-white border border-line p-5 sm:p-6 shadow-soft space-y-4">
        <SectionTitle>Monétisation</SectionTitle>
        <p className="text-[11.5px] text-night-dim leading-relaxed">
          Tu reçois <strong>90 %</strong> des super-chats, cadeaux et tips
          (Stripe Connect). DIVARC retient 10 %. Activable dès aujourd&apos;hui
          si ton compte Stripe est connecté.
        </p>

        <ToggleRow
          label="Super-chats"
          desc="Messages payants épinglés en haut du chat. Tier color selon montant."
          checked={superChat}
          onChange={setSuperChat}
        />
        <ToggleRow
          label="Cadeaux virtuels"
          desc="Émojis animés envoyés en stream (rose, café, diamant, château…)."
          checked={gifts}
          onChange={setGifts}
        />
        <ToggleRow
          label="Tips (pourboires)"
          desc="Boutons rapides 1 / 2 / 5 / 10 € + custom."
          checked={tips}
          onChange={setTips}
        />
      </section>

      {/* === Section 5 : Replay (toggle advanced) === */}
      <section className="rounded-3xl bg-white border border-line p-5 sm:p-6 shadow-soft space-y-4">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <SectionTitle>Options avancées</SectionTitle>
          {advanced ? (
            <ChevronUp className="w-4 h-4 text-night-dim" aria-hidden />
          ) : (
            <ChevronDown className="w-4 h-4 text-night-dim" aria-hidden />
          )}
        </button>

        {advanced ? (
          <ToggleRow
            label="Enregistrer pour le replay (VOD)"
            desc="Ton live est sauvegardé automatiquement. Replay disponible quelques minutes après la fin."
            checked={isRecording}
            onChange={setIsRecording}
          />
        ) : null}
      </section>

      {/* CTA */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="h-11 px-4 rounded-full text-[13px] font-bold text-night-dim hover:text-night"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isPending || title.trim().length < 3}
          className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 text-white text-[13px] font-bold shadow-lg shadow-rose-500/20 hover:opacity-95 transition-opacity disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Radio className="w-4 h-4" aria-hidden />
          )}
          Démarrer le live
        </button>
      </div>
    </form>
  );
}

/* ============================================================
 * UI helpers
 * ============================================================ */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-night-dim">
      · {children}
    </h2>
  );
}

function Field({
  id,
  label,
  required,
  asGroup,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  /* asGroup : true quand les enfants ne sont PAS un input/select/textarea
     simple (ex. groupe de boutons custom). Évite le warning a11y
     "label htmlFor pointe vers un id inexistant". */
  asGroup?: boolean;
  children: React.ReactNode;
}) {
  const labelClass =
    "block text-[11px] font-bold uppercase tracking-wider text-night-dim mb-1.5";

  if (asGroup) {
    return (
      <div role="group" aria-labelledby={`${id}-label`}>
        <span id={`${id}-label`} className={labelClass}>
          {label}
          {required ? <span className="text-rose-600 ml-0.5">*</span> : null}
        </span>
        {children}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? <span className="text-rose-600 ml-0.5">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-[10.5px] text-night-dim leading-relaxed">
      {children}
    </p>
  );
}

function KindOption({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof Video;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 h-11 px-3 rounded-xl border transition-colors text-[13px] font-bold",
        active
          ? "border-night bg-night text-bg"
          : "border-line bg-white text-night hover:border-night/30",
      )}
    >
      <Icon className="w-4 h-4" aria-hidden />
      {label}
    </button>
  );
}

function VisibilityOption({
  label,
  desc,
  active,
  onClick,
}: {
  label: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border p-3 transition-colors",
        active
          ? "border-night bg-night/5"
          : "border-line bg-white hover:border-night/30",
      )}
    >
      <p className="text-[13px] font-bold text-night">{label}</p>
      <p className="text-[11.5px] text-night-dim leading-relaxed">{desc}</p>
    </button>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "shrink-0 mt-0.5 inline-flex items-center h-6 w-11 rounded-full transition-colors",
          checked ? "bg-gold-deep" : "bg-night/10",
        )}
      >
        <span
          className={cn(
            "inline-block w-5 h-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-night">{label}</p>
        <p className="text-[11.5px] text-night-dim leading-relaxed">{desc}</p>
      </div>
    </label>
  );
}
