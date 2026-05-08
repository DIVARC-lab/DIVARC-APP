"use client";

import { ArrowLeft, Loader2, PartyPopper, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
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
    <div className="space-y-7">
      <div>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
          · Étape 5 · Ton premier post
        </span>
        <h2 className="mt-3 font-display italic text-[34px] sm:text-[42px] text-night text-balance leading-[1.05] tracking-[-0.02em]">
          Dis bonjour à tes <span className="text-gold-deep">voisins</span>.
        </h2>
        <p className="mt-3 text-night-muted leading-relaxed">
          Une présentation rapide aide les autres à te répondre. Pas obligé,
          mais ça aide.
        </p>
      </div>

      {/* Composer card */}
      <div className="rounded-2xl border-2 border-gold/40 bg-gold/[0.04] p-4 shadow-[0_0_0_4px_rgba(244,185,66,0.1)]">
        <div className="flex items-center gap-3">
          <Avatar
            src={avatarUrl}
            fullName={fullName}
            size="md"
          />
          <div>
            <p className="font-display italic text-lg text-night leading-tight">
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
          className="mt-3 w-full bg-white rounded-xl border border-line px-3 py-2.5 text-base text-night font-display italic leading-snug placeholder:text-muted resize-none focus:outline-none focus:border-gold/50 focus:ring-4 focus:ring-gold/15"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-muted">
            Tu pourras toujours le modifier ou le supprimer plus tard.
          </p>
          <p className="text-[11px] text-muted tabular-nums">
            {body.length}/{MAX_LENGTH}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Retour
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onComplete}
            loading={completing && !publishing}
          >
            Plus tard
          </Button>
          <Button
            type="button"
            onClick={handlePublish}
            loading={publishing}
            size="lg"
            className="!bg-gold !text-night hover:!bg-gold-soft"
          >
            {publishing ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Send className="w-4 h-4" aria-hidden />
            )}
            Publier et entrer
          </Button>
        </div>
      </div>
    </div>
  );
}
