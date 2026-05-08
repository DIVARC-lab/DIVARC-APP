"use client";

import { Lock, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { CircleColor } from "@/lib/database.types";
import { createCircle } from "../actions";

const COLORS: ReadonlyArray<{
  id: CircleColor;
  label: string;
  swatch: string;
}> = [
  { id: "gold", label: "Or", swatch: "from-gold via-gold-soft to-gold-deep" },
  { id: "navy", label: "Nuit", swatch: "from-night via-night-soft to-night-muted" },
  { id: "emerald", label: "Émeraude", swatch: "from-emerald-500 to-emerald-800" },
  { id: "rose", label: "Rose", swatch: "from-rose-400 to-rose-700" },
  { id: "violet", label: "Violet", swatch: "from-violet-400 to-violet-700" },
  { id: "cream", label: "Crème", swatch: "from-cream via-bg to-gold/30" },
];

const EMOJI_SUGGESTIONS = ["🏘️", "🚲", "📚", "💻", "🌱", "🎨", "🏃", "🎵", "🍳", "👶"];

export function CircleCreateForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState<string>(EMOJI_SUGGESTIONS[0]!);
  const [color, setColor] = useState<CircleColor>("gold");
  const [isPrivate, setIsPrivate] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Le nom doit faire au moins 2 caractères.");
      return;
    }
    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    formData.set("emoji", emoji);
    formData.set("color", color);
    if (isPrivate) formData.set("is_private", "on");

    startTransition(async () => {
      const result = await createCircle(formData);
      /* En cas de succès, l'action redirige et n'atteint pas ce code. */
      if (result?.ok === false) {
        toast.error(result.error ?? "Création impossible.");
      }
    });
  };

  const swatch =
    COLORS.find((c) => c.id === color)?.swatch ?? COLORS[0]!.swatch;

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* Live preview */}
      <div
        aria-hidden
        className={cn(
          "rounded-3xl p-6 bg-gradient-to-br border border-line shadow-soft flex items-center gap-4",
          swatch,
        )}
      >
        <span className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl shrink-0">
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("font-display italic text-2xl truncate", color === "navy" || color === "emerald" || color === "rose" || color === "violet" ? "text-cream" : "text-night")}>
            {name || "Mon cercle"}
          </p>
          <p className={cn("text-sm mt-1 truncate", color === "navy" || color === "emerald" || color === "rose" || color === "violet" ? "text-cream/80" : "text-night/70")}>
            {description || "Une description courte de l'esprit du cercle"}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-night mb-2">
          Nom
        </label>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          maxLength={80}
          required
          placeholder="Voisins de Belleville"
          className="w-full h-12 rounded-xl border border-line bg-white px-4 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
        />
        <p className="mt-1 text-[11px] text-muted">2 à 80 caractères</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-night mb-2">
          Description (facultatif)
        </label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
          maxLength={500}
          rows={3}
          placeholder="L'entraide, les bons plans, les événements du quartier."
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15 resize-none"
        />
        <p className="mt-1 text-[11px] text-muted">{description.length}/500</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-night mb-2">
          Emoji
        </label>
        <div className="flex flex-wrap gap-2">
          {EMOJI_SUGGESTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              aria-pressed={emoji === e}
              className={cn(
                "w-11 h-11 rounded-xl border-2 text-xl flex items-center justify-center transition-all bg-white",
                emoji === e
                  ? "border-gold scale-105 shadow-soft"
                  : "border-line hover:border-gold/40",
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-night mb-2">
          Couleur
        </label>
        <div className="flex flex-wrap gap-3">
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColor(c.id)}
              aria-pressed={color === c.id}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "block w-12 h-12 rounded-2xl bg-gradient-to-br ring-2 transition-all",
                  c.swatch,
                  color === c.id
                    ? "ring-gold scale-105"
                    : "ring-transparent hover:ring-line",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  color === c.id ? "text-gold-deep" : "text-night-muted",
                )}
              >
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setIsPrivate((v) => !v)}
          aria-pressed={isPrivate}
          className={cn(
            "w-full flex items-center gap-3 p-4 rounded-2xl border transition-colors",
            isPrivate
              ? "bg-night/[0.04] border-night/20"
              : "bg-white border-line hover:border-night/20",
          )}
        >
          <span
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              isPrivate ? "bg-night text-cream" : "bg-gold/15 text-gold-deep",
            )}
          >
            {isPrivate ? (
              <Lock className="w-4 h-4" aria-hidden />
            ) : (
              <Sparkles className="w-4 h-4" aria-hidden />
            )}
          </span>
          <div className="flex-1 text-left">
            <p className="font-semibold text-night text-sm">
              {isPrivate ? "Cercle privé" : "Cercle public"}
            </p>
            <p className="text-xs text-muted-strong mt-0.5">
              {isPrivate
                ? "Visible seulement par les membres. Sur invitation."
                : "Tout le monde peut voir et rejoindre."}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 w-9 h-5 rounded-full transition-colors relative",
              isPrivate ? "bg-night" : "bg-line",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                isPrivate ? "left-0.5 translate-x-4" : "left-0.5",
              )}
            />
          </span>
        </button>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="submit" loading={pending}>
          Créer le cercle
        </Button>
      </div>
    </form>
  );
}
