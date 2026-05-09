"use client";

import { useCreator } from "./CreatorProvider";

/* CreatorModalHost — placeholder à l'étape 1.
 *
 * Cet host est monté UNE seule fois dans (app)/layout.tsx. Il consume
 * le CreatorContext et rend le shell modal complet (étape 3) avec dispatch
 * vers les modes (étapes 4-7).
 *
 * Pour l'instant : juste un check de cohérence — affiche un debug box si
 * le modal est ouvert. Sera remplacé par ContentCreatorModal complet à
 * l'étape 3. */
export function CreatorModalHost() {
  const { state, close } = useCreator();
  if (!state.open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Création de contenu"
      className="fixed inset-0 z-50 flex items-center justify-center bg-night/60 backdrop-blur-sm p-4"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-3xl bg-bg border border-line p-6 max-w-md w-full"
      >
        <p className="text-sm text-night-muted">
          Mode <strong>{state.mode}</strong> — shell modal à venir étape 3.
        </p>
      </div>
    </div>
  );
}
