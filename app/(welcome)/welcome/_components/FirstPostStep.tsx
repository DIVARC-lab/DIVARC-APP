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
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#b88a2a]">
          · Ton premier post
        </span>
        <h2 className="mt-3 font-display italic text-[36px] sm:text-[44px] text-[#0a1f44] text-balance leading-[1.05] tracking-[-0.02em]">
          Dis bonjour à tes{" "}
          <em className="italic bg-gradient-to-br from-[#f4b942] to-[#b88a2a] bg-clip-text text-transparent">
            voisins
          </em>
          .
        </h2>
        <p className="mt-3 text-[15px] text-[#4b5b87] leading-relaxed max-w-md">
          Une présentation rapide aide les autres à te répondre. Pas obligé,
          mais ça aide.
        </p>
      </header>

      {/* Composer card — bordure gold accentuée + barre dorée top-left
         (rappel du PostComposer du feed Session 3). */}
      <div className="relative rounded-3xl border border-[#f4b942]/40 bg-[#f4b942]/[0.05] p-5 shadow-[0_0_0_4px_rgba(244,185,66,0.08)]">
        <span
          aria-hidden
          className="absolute top-0 left-9 w-20 h-1 rounded-b-md bg-[#f4b942]"
        />
        <div className="flex items-center gap-3">
          <Avatar src={avatarUrl} fullName={fullName} size="md" />
          <div>
            <p className="font-display italic text-[19px] text-[#0a1f44] leading-tight">
              {fullName}
            </p>
            <p className="text-[11px] text-[#6b7280]">
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
          className="mt-3 w-full bg-[#ffffff] rounded-2xl border border-[#e6e9f0] px-4 py-3 text-[15px] text-[#0a1f44] font-display italic leading-snug placeholder:text-[#4b5b87] resize-none focus:outline-none focus:border-[#f4b942]/50 focus:ring-4 focus:ring-[#f4b942]/15"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-[#6b7280]">
            Modifiable ou supprimable plus tard.
          </p>
          <p className="text-[11px] text-[#6b7280] tabular-nums">
            {body.length}/{MAX_LENGTH}
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full text-sm font-semibold text-[#4b5b87] hover:text-[#0a1f44] hover:bg-[#0a1f44]/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Retour
        </button>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            type="button"
            onClick={onComplete}
            disabled={completing && !publishing}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full text-sm font-semibold text-[#4b5b87] hover:text-[#0a1f44] hover:bg-[#0a1f44]/5 transition-colors disabled:opacity-60"
          >
            {completing && !publishing ? "..." : "Plus tard"}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-gradient-to-br from-[#f4b942] to-[#b88a2a] text-[#0a1f44] font-extrabold text-[15px] hover:opacity-95 transition-opacity shadow-[0_16px_36px_-10px_rgba(244,185,66,0.55)] disabled:opacity-60"
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
