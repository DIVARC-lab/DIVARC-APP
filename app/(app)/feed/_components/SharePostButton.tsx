"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/tracking/eventTracker";

type Props = {
  postId: string;
};

/* SharePostButton — bouton partager fonctionnel.
 *
 * Comportement :
 * 1. Sur mobile (iOS/Android) → ouvre le menu de partage natif via
 *    navigator.share (WhatsApp, SMS, AirDrop, Mail, etc.).
 * 2. Sur desktop ou si Web Share API indispo → copie l'URL du post
 *    dans le presse-papiers + toast "Lien copié".
 *
 * L'ancien bouton était un <button> SANS onClick → ne faisait rien. */
export function SharePostButton({ postId }: Props) {
  const [pending, setPending] = useState(false);

  async function handleShare() {
    if (pending) return;
    setPending(true);

    const url = `${window.location.origin}/feed/${postId}`;
    const shareData: ShareData = {
      title: "Post sur DIVARC",
      text: "Regarde ce post sur DIVARC",
      url,
    };

    /* Web Share API si dispo (et si on est dans un contexte sécurisé). */
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        trackEvent("post.share_external", { target_post_id: postId });
        setPending(false);
        return;
      } catch (err) {
        /* AbortError = l'user a annulé le sheet de partage. Pas une erreur. */
        if (err instanceof Error && err.name === "AbortError") {
          setPending(false);
          return;
        }
        /* Sinon : fallback copie. */
      }
    }

    /* Fallback : copie du lien dans le presse-papiers. */
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié dans le presse-papiers.");
      trackEvent("post.share", { target_post_id: postId });
    } catch {
      toast.error("Impossible de partager. Copie manuelle : " + url);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={pending}
      aria-label="Partager"
      className="inline-flex items-center justify-center h-11 w-11 shrink-0 rounded-full text-night-soft hover:bg-night/5 hover:text-night transition-colors disabled:opacity-50"
    >
      <Send className="w-[15px] h-[15px]" aria-hidden />
    </button>
  );
}
