/* Architecture UI du feed style Facebook — barrel d'exports.
 *
 * Les composants sont définis dans des chemins existants pour éviter
 * la duplication. Cet index les ré-exporte sous des noms de domaine
 * clairs (FeedPostCard, PostMediaViewer, ReelPlayer, ReelQueue) qui
 * matchent l'architecture demandée :
 *
 *   ┌───────────────────────────────────────────────────────────┐
 *   │ FeedPostCard       — carte de post dans le feed (auteur,  │
 *   │                       texte, média, InteractionBar)        │
 *   │ PostMediaViewer    — modale photo plein écran +           │
 *   │                       CommentsPanel (sidebar/bottom-sheet) │
 *   │ CommentsPanel      — réutilisable : liste comments +      │
 *   │                       composer, supporte replies imbriqués │
 *   │ InteractionBar     — like / comment / share / save sous   │
 *   │                       un post (post + reel)                │
 *   │ ReelPlayer         — single reel player vertical 9:16     │
 *   │ ReelQueue          — file infinie de reels avec scroll    │
 *   │                       vertical, autoplay + preload         │
 *   └───────────────────────────────────────────────────────────┘
 *
 * Constantes :
 *   - `lib/feed/mediaFormat.ts` — formats Facebook officiels
 *     (1:1, 4:5, 1.91:1, 9:16) + classification + cover/contain
 */

export { InteractionBar } from "./InteractionBar";
export { CommentsPanel } from "./CommentsPanel";

/* Alias de domaine pour les composants existants — les chemins sources
 * peuvent évoluer sans casser les imports clients. */
export { PostCard as FeedPostCard } from "@/app/(app)/feed/_components/PostCard";
export { PhotoCommentsModal as PostMediaViewer } from "@/app/(app)/feed/_components/PhotoCommentsModal";
/* `ReelPlayer` = composant standalone autonome (HLS + autoplay + mute)
 * extrait de la logique de ReelView. `ReelItem` = wrapper d'un Reel
 * dans la file (= ReelView qui contient toute la logique métier :
 * actions, watch tracking, cold start). */
export { ReelPlayer } from "@/components/reels/ReelPlayer";
export { ReelView as ReelItem } from "@/components/reels/ReelView";
/* `ReelFeed` / `ReelQueue` sont 2 alias du même composant `ReelsFeed`. */
export { ReelsFeed as ReelFeed } from "@/components/reels/ReelsFeed";
export { ReelsFeed as ReelQueue } from "@/components/reels/ReelsFeed";
export { ReelCommentsSheet } from "@/components/reels/ReelCommentsSheet";

/* Constantes média réexportées pour usage cross-component. */
export {
  FB_FORMAT,
  classifyMediaShape,
  pickObjectFit,
  SHAPE_ASPECT_CLASS,
  SHAPE_SIZES,
  SHAPE_MAX_HEIGHT,
  BREAKPOINTS,
  type MediaShape,
} from "@/lib/feed/mediaFormat";
