"use client";

import { Loader2 } from "lucide-react";
import { StoryComposer } from "@/app/(app)/stories/new/StoryComposer";
import { useCurrentUserProfile } from "@/lib/hooks/useCurrentUserProfile";
import { useCreator } from "../CreatorProvider";

/* StoryMode — contenu du ContentCreatorModal en mode "story".
 *
 * Réutilise le StoryComposer existant en mode embedded. Le shell modal
 * externe (étape 3) override son layout en plein écran fond noir
 * (style Instagram/Snapchat) via `MODE_META.story.fullscreenDark`. */
export function StoryMode() {
  const { close } = useCreator();
  const me = useCurrentUserProfile();

  if (me.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-16">
        <Loader2 className="w-6 h-6 text-cream/60 animate-spin" aria-hidden />
      </div>
    );
  }
  if (me.status === "anonymous") {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-16 text-center">
        <p className="text-sm text-cream/70">
          Tu dois être connecté pour publier une story.
        </p>
      </div>
    );
  }

  /* Le StoryComposer attend un fond clair par défaut. Comme le shell modal
     est en fond noir pour les stories, on wrap dans un container blanc/cream
     pour garder le contraste optimal sur les contrôles. La caméra capture
     a son propre fond noir interne. */
  return (
    <div className="bg-bg min-h-full px-4 py-6 sm:px-6 sm:py-8">
      <StoryComposer
        embedded
        userId={me.user.id}
        onPublished={close}
      />
    </div>
  );
}
