"use client";

import { ImagePlus, Sparkles, Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import { useCreator } from "./CreatorProvider";

/* PostChipTrigger — chip teaser inline "Quoi de neuf, X ?" qui ouvre le
 * ContentCreatorModal global en mode post.
 *
 * Remplace le ChipTeaser interne du PostComposer dans les pages /feed
 * et /circles/[slug]. Le PostComposer continue d'exister pour ne pas
 * casser le legacy (utilisé par d'autres surfaces si besoin) — ce
 * composant prend juste le rôle "déclencheur" du modal global.
 *
 * `context` permet de précharger le modal avec un contexte (ex pour un
 * post dans un cercle, on peut passer { circleId } pour pré-remplir
 * la visibility). */
type PostChipTriggerProps = {
  authorName: string | null;
  authorAvatarUrl: string | null;
  /** Métadonnées contextuelles (ex circleId) pour passer au mode post. */
  context?: Record<string, unknown>;
};

export function PostChipTrigger({
  authorName,
  authorAvatarUrl,
  context,
}: PostChipTriggerProps) {
  const { open } = useCreator();
  const firstName = authorName?.split(" ")[0] ?? null;

  function openCreator() {
    open({ mode: "post", context });
  }

  return (
    <article className="relative overflow-hidden rounded-[28px] bg-white shadow-[0_1px_2px_rgba(10,31,68,0.04),0_16px_40px_-20px_rgba(10,31,68,0.18)]">
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 left-7 w-[60px] h-1 rounded-b-md bg-gold"
      />
      <button
        type="button"
        onClick={openCreator}
        className="flex items-center gap-3 w-full px-4 pt-4 pb-3 text-left"
        aria-label="Composer un post"
      >
        <Avatar src={authorAvatarUrl} fullName={authorName} size="md-bold" />
        <div className="flex-1 min-w-0 text-[14px] leading-tight">
          <span className="font-display italic text-[17px] text-night">
            Quoi de neuf
          </span>
          {firstName ? (
            <span className="text-night-dim">, {firstName} ?</span>
          ) : (
            <span className="text-night-dim"> ?</span>
          )}
        </div>
      </button>
      <div className="flex gap-2 px-4 pb-4">
        <Pill
          onClick={openCreator}
          tone="gold"
          icon={<ImagePlus className="w-3 h-3" aria-hidden />}
          label="Photo"
        />
        <Pill
          onClick={openCreator}
          tone="muted"
          icon={<Sparkles className="w-3 h-3" aria-hidden />}
          label="Moment"
        />
        <Pill
          onClick={openCreator}
          tone="muted"
          icon={<Users className="w-3 h-3" aria-hidden />}
          label="Amis"
        />
      </div>
    </article>
  );
}

function Pill({
  onClick,
  tone,
  icon,
  label,
}: {
  onClick: () => void;
  tone: "gold" | "muted";
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 inline-flex items-center justify-center gap-1 h-9 rounded-full text-[12px] font-bold transition-colors",
        tone === "gold"
          ? "bg-cream text-gold-deep border border-gold/30 hover:bg-gold/15"
          : "bg-bg-soft text-night-muted border border-line hover:border-night/30 hover:text-night",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
