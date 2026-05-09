"use client";

import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { createPost } from "@/app/(app)/feed/actions";

type FirstPostStepProps = {
  fullName: string;
  avatarUrl: string | null;
  location: string | null;
  onBack: () => void;
  onComplete: () => void;
  completing: boolean;
};

const MAX_LENGTH = 600;

/** Encouragement de premier post. Optionnel : "Plus tard, juste entrer"
 *  appelle onComplete sans publier. Sinon createPost serveur action. */
export function FirstPostStep({
  fullName,
  avatarUrl,
  location,
  onBack,
  onComplete,
  completing,
}: FirstPostStepProps) {
  const [body, setBody] = useState(
    `Salut ! Je viens d'arriver sur DIVARC.${location ? ` J'habite ${location}.` : ""} `,
  );
  const [publishing, startPublishing] = useTransition();

  function handlePublish() {
    if (body.trim().length === 0) {
      toast.error("Écris quelque chose ou clique sur « plus tard ».");
      return;
    }
    startPublishing(async () => {
      const formData = new FormData();
      formData.set("body", body);
      formData.set("visibility", "friends");
      formData.set("photos", "[]");
      formData.set("video", "");
      const result = await createPost({ status: "idle" }, formData);
      if (result.status === "success") {
        toast.success("Premier post publié ✨");
        onComplete();
      } else if (result.message) {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-8">
      <header>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
          · Ton premier post
        </span>
        <h2 className="mt-3 font-display italic text-[36px] sm:text-[44px] text-night text-balance leading-[1.05] tracking-[-0.02em]">
          Dis bonjour à tes{" "}
          <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
            voisins
          </em>
          .
        </h2>
        <p className="mt-3 text-[15px] text-night-muted leading-relaxed max-w-md">
          Une présentation rapide aide les autres à te répondre. Pas obligé,
          mais ça aide.
        </p>
      </header>

      {/* Composer card — bordure gold accentuée + barre dorée top-left
         (rappel du PostComposer du feed Session 3). */}
      <div className="relative rounded-3xl border border-gold/40 bg-gold/[0.05] p-5 shadow-[0_0_0_4px_rgba(244,185,66,0.08)]">
        <span
          aria-hidden
          className="absolute top-0 left-9 w-20 h-1 rounded-b-md bg-gold"
        />
        <div className="flex items-center gap-3">
          <Avatar src={avatarUrl} fullName={fullName} size="md" />
          <div>
            <p className="font-display italic text-[19px] text-night leading-tight">
              {fullName}
            </p>
            <p className="text-[11px] text-muted">
              {location ? `Public · ${location}` : "Public"}
            </p>
          </div>
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.currentTarget.value)}
          maxLength={MAX_LENGTH}
          rows={5}
          placeholder="Salut ! Je viens d'arriver sur DIVARC. J'aime…"
          className="mt-3 w-full bg-white rounded-2xl border border-line px-4 py-3 text-[15px] text-night font-display italic leading-snug placeholder:text-night-dim resize-none focus:outline-none focus:border-gold/50 focus:ring-4 focus:ring-gold/15"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-muted">
            Modifiable ou supprimable plus tard.
          </p>
          <p className="text-[11px] text-muted tabular-nums">
            {body.length}/{MAX_LENGTH}
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full text-sm font-semibold text-night-muted hover:text-night hover:bg-night/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Retour
        </button>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            type="button"
            onClick={onComplete}
            disabled={completing && !publishing}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full text-sm font-semibold text-night-muted hover:text-night hover:bg-night/5 transition-colors disabled:opacity-60"
          >
            {completing && !publishing ? "..." : "Plus tard"}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-gradient-to-br from-gold to-gold-deep text-night font-extrabold text-[15px] hover:opacity-95 transition-opacity shadow-[0_16px_36px_-10px_rgba(244,185,66,0.55)] disabled:opacity-60"
          >
            {publishing ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Send className="w-4 h-4" aria-hidden />
            )}
            Publier et entrer
          </button>
        </div>
      </div>
    </div>
  );
}
