"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createHub } from "../actions";

export function CreateHubForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("");
  const [colorAccent, setColorAccent] = useState("#C9A961");
  const [primaryCategory, setPrimaryCategory] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [joinPolicy, setJoinPolicy] = useState<"open" | "approval">("approval");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (name.trim().length < 2) {
      toast.error("Le nom doit faire au moins 2 caractères");
      return;
    }
    startTransition(async () => {
      const res = await createHub({
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        description: description.trim() || undefined,
        emoji: emoji.trim() || undefined,
        colorAccent,
        primaryCategory: primaryCategory.trim() || undefined,
        tags: [],
        visibility,
        joinPolicy,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Hub créé : ${res.slug}`);
      router.push(`/circles/hubs/${res.slug}`);
    });
  }

  return (
    <div className="bg-white border border-line rounded-3xl p-5 sm:p-6 space-y-4">
      <Field label="Nom du hub" required>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: FrenchTech, Restaurateurs Dakar"
          maxLength={80}
          className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px]"
        />
      </Field>

      <Field label="Tagline (optionnel)">
        <input
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Phrase courte qui décrit ce hub"
          maxLength={140}
          className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px]"
        />
      </Field>

      <Field label="Description (optionnel)">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Détaille la mission et la thématique du hub"
          rows={4}
          maxLength={4000}
          className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px] resize-y"
        />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Emoji">
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="🚀"
            maxLength={8}
            className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px] text-center"
          />
        </Field>
        <Field label="Couleur accent">
          <input
            type="color"
            value={colorAccent}
            onChange={(e) => setColorAccent(e.target.value)}
            className="w-full h-10 rounded-xl border border-line cursor-pointer"
          />
        </Field>
        <Field label="Catégorie">
          <input
            type="text"
            value={primaryCategory}
            onChange={(e) => setPrimaryCategory(e.target.value)}
            placeholder="Tech, Culture…"
            maxLength={80}
            className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px]"
          />
        </Field>
      </div>

      <Field label="Visibilité">
        <div className="flex gap-2">
          {(["public", "unlisted"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisibility(v)}
              className={`flex-1 h-9 rounded-xl text-[12px] font-bold transition-colors ${
                visibility === v
                  ? "bg-night text-cream"
                  : "bg-night/5 text-night-muted hover:bg-night/10"
              }`}
            >
              {v === "public" ? "Public (découvrable)" : "Sur lien direct"}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Politique d'adhésion des cercles">
        <div className="flex gap-2">
          {(["open", "approval"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setJoinPolicy(p)}
              className={`flex-1 h-9 rounded-xl text-[12px] font-bold transition-colors ${
                joinPolicy === p
                  ? "bg-night text-cream"
                  : "bg-night/5 text-night-muted hover:bg-night/10"
              }`}
            >
              {p === "open" ? "Auto-acceptation" : "Approbation requise"}
            </button>
          ))}
        </div>
      </Field>

      <div className="flex items-center justify-end gap-2 pt-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending || name.trim().length < 2}
          className="inline-flex items-center h-11 px-5 rounded-full bg-gold text-night font-bold text-[14px] disabled:opacity-50 hover:bg-gold-soft"
        >
          {pending ? "Création…" : "Créer le hub"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-night-muted mb-1.5">
        {label}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </span>
      {children}
    </label>
  );
}
