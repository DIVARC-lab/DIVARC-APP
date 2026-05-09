"use client";

import {
  CreatorModalShell,
  CreatorModePlaceholder,
} from "./ContentCreatorModal";
import { useCreator } from "./CreatorProvider";
import { PostMode } from "./modes/PostMode";
import { StoryMode } from "./modes/StoryMode";

/* CreatorModalHost — monté UNE seule fois dans (app)/layout.tsx.
 *
 * Consume le CreatorContext et dispatch vers le composant Mode* approprié.
 * Les modes encore à brancher (listing/job/event, étapes 7) tombent sur
 * le placeholder. */
export function CreatorModalHost() {
  const { state } = useCreator();
  if (!state.open || !state.mode) return null;

  return (
    <CreatorModalShell>
      {state.mode === "post" ? (
        <PostMode />
      ) : state.mode === "story" ? (
        <StoryMode />
      ) : (
        <CreatorModePlaceholder mode={state.mode} />
      )}
    </CreatorModalShell>
  );
}
