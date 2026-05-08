"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { CircleEventCategory } from "@/lib/database.types";
import { createCircleEvent } from "../../../actions";

const CATEGORIES: ReadonlyArray<{
  id: CircleEventCategory;
  label: string;
  emoji: string;
}> = [
  { id: "community", label: "Communauté", emoji: "🤝" },
  { id: "social", label: "Social", emoji: "🍷" },
  { id: "cultural", label: "Culturel", emoji: "🎭" },
];

const localISO = (offsetHours = 1) => {
  const d = new Date(Date.now() + offsetHours * 3600 * 1000);
  d.setSeconds(0, 0);
  /* yyyy-MM-ddTHH:mm — datetime-local format expects local time. */
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type CircleEventCreateFormProps = {
  circleId: string;
  circleSlug: string;
};

export function CircleEventCreateForm({
  circleId,
}: CircleEventCreateFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<CircleEventCategory>("community");
  const [startsAt, setStartsAt] = useState(localISO(24));
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (title.trim().length < 2) {
      toast.error("Le titre doit faire au moins 2 caractères.");
      return;
    }
    /* Convert local datetime to ISO with timezone. */
    const startsAtIso = new Date(startsAt).toISOString();
    const endsAtIso = endsAt ? new Date(endsAt).toISOString() : "";

    const formData = new FormData();
    formData.set("circle_id", circleId);
    formData.set("title", title);
    formData.set("description", description);
    formData.set("location", location);
    formData.set("category", category);
    formData.set("starts_at", startsAtIso);
    formData.set("ends_at", endsAtIso);
    formData.set("capacity", capacity);

    startTransition(async () => {
      const result = await createCircleEvent(formData);
      /* En cas de succès l'action redirige donc on n'arrive pas ici. */
      if (result?.ok === false) {
        toast.error(result.error ?? "Création impossible.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-night mb-2">
          Titre
        </label>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
          maxLength={120}
          required
          placeholder="Apéro voisins"
          className="w-full h-12 rounded-xl border border-line bg-white px-4 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-night mb-2">
          Catégorie
        </label>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              aria-pressed={category === c.id}
              className={cn(
                "px-4 h-10 rounded-full border text-sm font-semibold inline-flex items-center gap-2 transition-colors",
                category === c.id
                  ? "bg-night text-cream border-night"
                  : "bg-white border-line text-night-muted hover:border-night/40",
              )}
            >
              <span>{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-night mb-2">
            Début
          </label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.currentTarget.value)}
            required
            className="w-full h-12 rounded-xl border border-line bg-white px-4 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-night mb-2">
            Fin (facultatif)
          </label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.currentTarget.value)}
            className="w-full h-12 rounded-xl border border-line bg-white px-4 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-night mb-2">
          Lieu (facultatif)
        </label>
        <input
          type="text"
          value={location}
          onChange={(event) => setLocation(event.currentTarget.value)}
          maxLength={200}
          placeholder="Place de la République, Paris 11e"
          className="w-full h-12 rounded-xl border border-line bg-white px-4 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-night mb-2">
          Description (facultatif)
        </label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
          maxLength={2000}
          rows={4}
          placeholder="Apporte un truc à grignoter, on partage tout."
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15 resize-none"
        />
        <p className="mt-1 text-[11px] text-muted">{description.length}/2000</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-night mb-2">
          Capacité (facultatif)
        </label>
        <input
          type="number"
          value={capacity}
          onChange={(event) => setCapacity(event.currentTarget.value)}
          min={1}
          max={5000}
          placeholder="Pas de limite"
          className="w-full sm:w-48 h-12 rounded-xl border border-line bg-white px-4 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={pending}>
          Créer l'événement
        </Button>
      </div>
    </form>
  );
}
