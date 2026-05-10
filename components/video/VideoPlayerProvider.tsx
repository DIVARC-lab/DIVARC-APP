"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";

/* VideoPlayerProvider — état global du lecteur vidéo Facebook-style.
 *
 * Pattern : React Context + useReducer (cohérent avec CreatorProvider).
 *
 * Une seule vidéo "active" à la fois. Quand l'utilisateur tap sur un
 * FeedVideoPlayer, on stocke ici son id + source + timestamp courant,
 * et on bascule en mode "expanded". Le scroll vers le bas dans le
 * feed la passe en "mini" (PiP flottant). Tap sur le mini → re-expand.
 *
 * Sync entre les 3 composants `<video>` distincts (feed inline /
 * expanded overlay / mini PiP) : on snapshot le currentTime quand le
 * mode change, et le composant nouvellement actif lit le snapshot pour
 * démarrer au bon endroit (Option B du brief — simple et robuste).
 */

export type VideoSource = {
  /** ID stable du post / vidéo, sert de clé de comparaison. */
  id: string;
  /** URL HLS .m3u8 (priorité). */
  hlsUrl?: string | null;
  /** URL MP4 fallback (toujours fournie). */
  mp4Url: string;
  /** Poster (preview frame). */
  posterUrl?: string | null;
  /** Durée connue en ms (peut être null avant chargement metadata). */
  durationMs?: number | null;
  /** Ratio "WIDTH / HEIGHT" pour préserver l'aspect (default 16/9). */
  aspectRatio?: string | null;
  /** ID du post parent pour deep-link / actions like/comment. */
  postId: string;
  /** Loop si vidéo courte (< 30s). */
  loop?: boolean;
};

export type VideoMode = "closed" | "inline" | "expanded" | "mini" | "fullscreen";

export type VideoPlayerState = {
  source: VideoSource | null;
  mode: VideoMode;
  /** Snapshot du currentTime au dernier changement de mode. */
  currentTime: number;
  /** Hint pour les composants : faut-il jouer (true) ou pause ? */
  isPlaying: boolean;
  isMuted: boolean;
  volume: number; // 0-1
  playbackRate: number;
  /** Position du mini-player (px depuis top-left fenêtre). */
  miniPosition: { x: number; y: number };
};

type Action =
  | { type: "EXPAND"; source: VideoSource; currentTime?: number }
  | { type: "SHRINK_TO_MINI"; currentTime: number }
  | { type: "EXPAND_FROM_MINI"; currentTime: number }
  | { type: "FULLSCREEN" }
  | { type: "EXIT_FULLSCREEN"; currentTime: number }
  | { type: "CLOSE" }
  | { type: "SET_TIME"; currentTime: number }
  | { type: "SET_PLAYING"; isPlaying: boolean }
  | { type: "TOGGLE_MUTE" }
  | { type: "SET_VOLUME"; volume: number }
  | { type: "SET_PLAYBACK_RATE"; rate: number }
  | { type: "SET_MINI_POSITION"; x: number; y: number };

const INITIAL_STATE: VideoPlayerState = {
  source: null,
  mode: "closed",
  currentTime: 0,
  isPlaying: false,
  isMuted: true,
  volume: 1,
  playbackRate: 1,
  miniPosition: { x: 0, y: 0 },
};

function reducer(state: VideoPlayerState, action: Action): VideoPlayerState {
  switch (action.type) {
    case "EXPAND":
      /* Si on expand une nouvelle vidéo : reset currentTime. Si même
         vidéo : préserve le timestamp courant. */
      return {
        ...state,
        source: action.source,
        mode: "expanded",
        currentTime:
          state.source?.id === action.source.id
            ? (action.currentTime ?? state.currentTime)
            : (action.currentTime ?? 0),
        /* Premier expand : son automatique ON (tap = intent user). */
        isMuted: false,
        isPlaying: true,
      };
    case "SHRINK_TO_MINI":
      if (!state.source) return state;
      return {
        ...state,
        mode: "mini",
        currentTime: action.currentTime,
      };
    case "EXPAND_FROM_MINI":
      if (!state.source) return state;
      return {
        ...state,
        mode: "expanded",
        currentTime: action.currentTime,
      };
    case "FULLSCREEN":
      if (!state.source) return state;
      return { ...state, mode: "fullscreen" };
    case "EXIT_FULLSCREEN":
      if (!state.source) return state;
      return {
        ...state,
        mode: "expanded",
        currentTime: action.currentTime,
      };
    case "CLOSE":
      return { ...INITIAL_STATE, miniPosition: state.miniPosition };
    case "SET_TIME":
      return { ...state, currentTime: action.currentTime };
    case "SET_PLAYING":
      return { ...state, isPlaying: action.isPlaying };
    case "TOGGLE_MUTE":
      return { ...state, isMuted: !state.isMuted };
    case "SET_VOLUME":
      return {
        ...state,
        volume: Math.max(0, Math.min(1, action.volume)),
        isMuted: action.volume === 0,
      };
    case "SET_PLAYBACK_RATE":
      return {
        ...state,
        playbackRate: Math.max(0.25, Math.min(4, action.rate)),
      };
    case "SET_MINI_POSITION":
      return {
        ...state,
        miniPosition: { x: action.x, y: action.y },
      };
    default:
      return state;
  }
}

type VideoPlayerContextValue = VideoPlayerState & {
  /** Ouvre une vidéo en mode expanded. Si même id que la courante,
   *  préserve le timestamp. */
  expand: (source: VideoSource, currentTime?: number) => void;
  /** Passe en mini-player (PiP flottant) avec timestamp préservé. */
  shrinkToMini: (currentTime: number) => void;
  /** Re-expand depuis mini-player. */
  expandFromMini: (currentTime: number) => void;
  /** Fullscreen natif. */
  enterFullscreen: () => void;
  exitFullscreen: (currentTime: number) => void;
  /** Ferme complètement le lecteur (sortie du flow). */
  close: () => void;
  /** Sync timestamp depuis un composant `<video>` actif. */
  setTime: (currentTime: number) => void;
  setPlaying: (isPlaying: boolean) => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setMiniPosition: (x: number, y: number) => void;
};

const VideoPlayerContext = createContext<VideoPlayerContextValue | null>(null);

export function VideoPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const expand = useCallback((source: VideoSource, currentTime?: number) => {
    dispatch({ type: "EXPAND", source, currentTime });
  }, []);

  const shrinkToMini = useCallback((currentTime: number) => {
    dispatch({ type: "SHRINK_TO_MINI", currentTime });
  }, []);

  const expandFromMini = useCallback((currentTime: number) => {
    dispatch({ type: "EXPAND_FROM_MINI", currentTime });
  }, []);

  const enterFullscreen = useCallback(() => {
    dispatch({ type: "FULLSCREEN" });
  }, []);

  const exitFullscreen = useCallback((currentTime: number) => {
    dispatch({ type: "EXIT_FULLSCREEN", currentTime });
  }, []);

  const close = useCallback(() => {
    dispatch({ type: "CLOSE" });
  }, []);

  const setTime = useCallback((currentTime: number) => {
    dispatch({ type: "SET_TIME", currentTime });
  }, []);

  const setPlaying = useCallback((isPlaying: boolean) => {
    dispatch({ type: "SET_PLAYING", isPlaying });
  }, []);

  const toggleMute = useCallback(() => {
    dispatch({ type: "TOGGLE_MUTE" });
  }, []);

  const setVolume = useCallback((volume: number) => {
    dispatch({ type: "SET_VOLUME", volume });
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    dispatch({ type: "SET_PLAYBACK_RATE", rate });
  }, []);

  const setMiniPosition = useCallback((x: number, y: number) => {
    dispatch({ type: "SET_MINI_POSITION", x, y });
  }, []);

  const value = useMemo<VideoPlayerContextValue>(
    () => ({
      ...state,
      expand,
      shrinkToMini,
      expandFromMini,
      enterFullscreen,
      exitFullscreen,
      close,
      setTime,
      setPlaying,
      toggleMute,
      setVolume,
      setPlaybackRate,
      setMiniPosition,
    }),
    [
      state,
      expand,
      shrinkToMini,
      expandFromMini,
      enterFullscreen,
      exitFullscreen,
      close,
      setTime,
      setPlaying,
      toggleMute,
      setVolume,
      setPlaybackRate,
      setMiniPosition,
    ],
  );

  return (
    <VideoPlayerContext.Provider value={value}>
      {children}
    </VideoPlayerContext.Provider>
  );
}

export function useVideoPlayer(): VideoPlayerContextValue {
  const ctx = useContext(VideoPlayerContext);
  if (!ctx) {
    throw new Error(
      "useVideoPlayer doit être utilisé dans un <VideoPlayerProvider>",
    );
  }
  return ctx;
}
