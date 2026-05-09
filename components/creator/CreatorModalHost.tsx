"use client";

import {
  CreatorModalShell,
  CreatorModePlaceholder,
} from "./ContentCreatorModal";
import { useCreator } from "./CreatorProvider";
import { PostMode } from "./modes/PostMode";
import { SimpleRedirectMode } from "./modes/SimpleRedirectMode";
import { StoryMode } from "./modes/StoryMode";

/* CreatorModalHost — monté UNE seule fois dans (app)/layout.tsx.
 *
 * Dispatch vers le composant Mode* approprié selon state.mode :
 *  - post / story : modes inlinés complets (étapes 4-5)
 *  - listing / job / event : SimpleRedirectMode (teaser + CTA route
 *    dédiée). Inline complet de ces forms reporté à un cycle ultérieur
 *    de polish. */
export function CreatorModalHost() {
  const { state } = useCreator();
  if (!state.open || !state.mode) return null;

  const m = state.mode;

  return (
    <CreatorModalShell>
      {m === "post" ? (
        <PostMode />
      ) : m === "story" ? (
        <StoryMode />
      ) : m === "listing" || m === "job" || m === "event" ? (
        <SimpleRedirectMode mode={m} />
      ) : (
        <CreatorModePlaceholder mode={m} />
      )}
    </CreatorModalShell>
  );
}
