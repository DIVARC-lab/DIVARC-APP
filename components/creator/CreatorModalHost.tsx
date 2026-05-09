"use client";

import {
  CreatorModalShell,
  CreatorModePlaceholder,
} from "./ContentCreatorModal";
import { useCreator } from "./CreatorProvider";

/* CreatorModalHost — monté UNE seule fois dans (app)/layout.tsx.
 *
 * Consume le CreatorContext et rend le ContentCreatorModal complet. Le
 * dispatch vers les composants spécifiques par mode (PostMode, StoryMode,
 * ListingMode, JobMode, EventMode) est branché aux étapes 4-7. Pour
 * l'instant : placeholder neutre par mode. */
export function CreatorModalHost() {
  const { state } = useCreator();
  if (!state.open || !state.mode) return null;

  return (
    <CreatorModalShell>
      <CreatorModePlaceholder mode={state.mode} />
    </CreatorModalShell>
  );
}
