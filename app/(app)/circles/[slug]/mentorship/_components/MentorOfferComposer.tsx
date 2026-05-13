"use client";

import { Loader2, Save, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createOrUpdateMentorOffer,
  deleteMentorOffer,
  toggleMentorOfferOpen,
} from "@/app/(app)/circles/actions";
import { Input, Textarea } from "@/components/ui/Input";
import type { CircleMentorOffer } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";

type Props = {
  circleId: string;
  initial: CircleMentorOffer | null;
};

export function MentorOfferComposer({ circleId, initial }: Props) {
  const [editing, setEditing] = useState(!initial);
  const [pending, startTransition] = useTransition();
  const [headline, setHeadline] = useState(initial?.headline ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [expertise, setExpertise] = useState<string[]>(
    initial?.expertise ?? [],
  );
  const [tagInput, setTagInput] = useState("");
  const [availability, setAvailability] = useState(initial?.availability ?? "");
  const [capacity, setCapacity] = useState<string>(
    initial?.capacity ? String(initial.capacity) : "",
  );

  function addTag() {
    const v = tagInput.trim().toLowerCase().slice(0, 40);
    if (!v || expertise.includes(v) || expertise.length >= 10) {
      setTagInput("");
      return;
    }
    setExpertise([...expertise, v]);
    setTagInput("");
  }

  function submit() {
    if (headline.trim().length < 10) {
      toast.error("Headline trop court (min 10 caractères).");
      return;
    }
    startTransition(async () => {
      const result = await createOrUpdateMentorOffer(circleId, {
        headline,
        bio,
        expertise,
        availability,
        capacity: capacity ? Number(capacity) : null,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Échec.");
        return;
      }
      toast.success(initial ? "Offre mise à jour." : "Tu es maintenant mentor !");
      setEditing(false);
    });
  }

  function remove() {
    if (!initial) return;
    if (!confirm("Supprimer ton offre de mentor ?")) return;
    startTransition(async () => {
      const result = await deleteMentorOffer(initial.id);
      if (!result.ok) toast.error(result.error ?? "Suppression impossible.");
      else toast.success("Offre supprimée.");
    });
  }

  function toggleOpen() {
    if (!initial) return;
    startTransition(async () => {
      const result = await toggleMentorOfferOpen(initial.id);
      if (!result.ok) toast.error(result.error ?? "Action impossible.");
      else
        toast.success(
          initial.is_open ? "Tu n'es plus disponible." : "Tu es à nouveau dispo.",
        );
    });
  }

  if (!editing && initial) {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <p className="text-[13px] font-bold text-night">
            {initial.headline}
          </p>
          <span
            className={cn(
              "inline-flex items-center h-5 px-2 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
              initial.is_open
                ? "bg-emerald-100 text-emerald-700"
                : "bg-bg text-night-dim",
            )}
          >
            {initial.is_open ? "Ouvert" : "Fermé"}
          </span>
        </div>
        {initial.bio ? (
          <p className="text-[12px] text-night-soft mb-2">{initial.bio}</p>
        ) : null}
        {initial.expertise.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {initial.expertise.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 h-5 rounded-full bg-bg text-[10px] font-bold text-night-dim"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
        {initial.availability ? (
          <p className="text-[11px] text-night-dim mb-3">
            Dispo : {initial.availability}
            {initial.capacity ? ` · ${initial.current_mentees}/${initial.capacity} mentees` : ""}
          </p>
        ) : null}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-night text-cream text-[11px] font-bold hover:bg-night-soft transition-colors"
          >
            Modifier
          </button>
          <button
            type="button"
            onClick={toggleOpen}
            disabled={pending}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-white border border-line text-night text-[11px] font-bold hover:border-night/30 transition-colors disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
            ) : null}
            {initial.is_open ? "Marquer indispo" : "Réactiver"}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label="Supprimer mon offre"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-red-50 text-night-dim hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <Input
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
        maxLength={160}
        placeholder="Headline (ex: Senior dev React qui partage 8 ans de prod)"
        className="text-[13px]"
      />
      <Textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Bio courte : ton parcours, ce que tu aimes transmettre…"
        className="text-[13px]"
      />
      <div>
        <div className="flex gap-1.5">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Domaines : react, nextjs, … (max 10)"
            maxLength={40}
            className="text-[12px]"
          />
          <button
            type="button"
            onClick={addTag}
            className="h-10 px-3 rounded-xl bg-night text-cream text-[11px] font-bold"
          >
            +
          </button>
        </div>
        {expertise.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {expertise.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 h-5 pl-2 pr-1 rounded-full bg-bg-soft text-[10px] font-bold text-night"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() =>
                    setExpertise(expertise.filter((t) => t !== tag))
                  }
                  className="w-3.5 h-3.5 inline-flex items-center justify-center hover:bg-line rounded-full"
                  aria-label="Retirer"
                >
                  <X className="w-2.5 h-2.5" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Input
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          maxLength={80}
          placeholder="Dispo : 1h/sem, weekends…"
          className="text-[12px]"
        />
        <Input
          type="number"
          min={1}
          max={50}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="Capacité (mentees max)"
          className="text-[12px]"
        />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        {initial ? (
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={pending}
            className="h-9 px-3 rounded-full text-[12px] font-bold text-night-dim hover:text-night transition-colors"
          >
            Annuler
          </button>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={pending || headline.trim().length < 10}
          className="inline-flex items-center gap-1 h-9 px-4 rounded-full bg-night text-cream text-[12px] font-extrabold hover:bg-night-soft transition-colors disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Save className="w-3.5 h-3.5" aria-hidden />
          )}
          {initial ? "Mettre à jour" : "Devenir mentor"}
        </button>
      </div>
    </div>
  );
}
