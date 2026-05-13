"use client";

import { Loader2, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { updateCircleSettings } from "../../../actions";

const COLOR_PRESETS = [
  "#C9A961",
  "#0A1F44",
  "#10B981",
  "#F43F5E",
  "#8B5CF6",
  "#F59E0B",
  "#0EA5E9",
  "#EC4899",
];

type Props = {
  circleId: string;
  initial: {
    name: string;
    tagline: string | null;
    emoji: string | null;
    color_accent: string;
  };
};

export function EditIdentityForm({ circleId, initial }: Props) {
  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline ?? "");
  const [emoji, setEmoji] = useState(initial.emoji ?? "");
  const [color, setColor] = useState(initial.color_accent);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await updateCircleSettings(circleId, {
        name,
        tagline,
        emoji,
        color_accent: color,
      });
      if (!result.ok) toast.error(result.error ?? "Échec.");
      else toast.success("Identité mise à jour.");
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[12px] font-bold text-night mb-1">
          Nom du cercle
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
        />
      </div>
      <div>
        <label className="block text-[12px] font-bold text-night mb-1">
          Tagline
        </label>
        <Input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={140}
          placeholder="Slogan court"
        />
      </div>
      <div className="flex gap-3 items-start">
        <div className="w-28">
          <label className="block text-[12px] font-bold text-night mb-1">
            Emoji
          </label>
          <Input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 8))}
            className="text-center text-xl"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[12px] font-bold text-night mb-1">
            Couleur
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map((c) => {
              const active = color === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-pressed={active}
                  aria-label={c}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    active && "ring-2 ring-offset-2 ring-night",
                  )}
                  style={{ backgroundColor: c }}
                />
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-night text-cream text-[12px] font-extrabold hover:bg-night-soft transition-colors disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Save className="w-3.5 h-3.5" aria-hidden />
          )}
          Enregistrer
        </button>
      </div>
    </div>
  );
}
