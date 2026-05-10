"use client";

import { useVideoPlayer } from "./VideoPlayerProvider";
import { ExpandedVideoPlayer } from "./ExpandedVideoPlayer";
import { MiniVideoPlayer } from "./MiniVideoPlayer";

/* VideoPlayerHost — composant racine monté UNE seule fois dans
 * (app)/layout.tsx. Rend conditionnellement l'overlay expanded ou
 * le mini-player flottant selon `mode` du context.
 *
 * Le FeedVideoPlayer inline reste rendu dans chaque PostCard (pas ici).
 * C'est lui qui appelle expand() au tap pour pousser dans le state
 * global, puis ce host prend le relais.
 */
export function VideoPlayerHost() {
  const { mode, source } = useVideoPlayer();

  if (!source) return null;

  if (mode === "expanded" || mode === "fullscreen") {
    return <ExpandedVideoPlayer />;
  }
  if (mode === "mini") {
    return <MiniVideoPlayer />;
  }
  return null;
}
