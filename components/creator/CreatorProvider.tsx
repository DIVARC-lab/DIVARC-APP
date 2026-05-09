"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* CreatorProvider — état UI global du modal de création de contenu.
 *
 * Pattern : Context React (cohérent avec ConfirmProvider). Pas de Zustand
 * pour ne pas alourdir la stack — un seul slice d'état suffit ici.
 *
 * Le modal est monté UNE seule fois dans (app)/layout.tsx via
 * CreatorModalHost (composant séparé qui consume ce context). Tous les
 * triggers (chip feed, FAB nav, /create hub) appellent useCreator().open(...).
 *
 * Drafts : persistés en localStorage par mode pour permettre la reprise
 * si le user ferme accidentellement. Clé `divarc:creator-draft:${mode}`.
 */

export type CreatorMode = "post" | "story" | "listing" | "job" | "event";

export type CreatorDraft = {
  /** Texte / titre principal selon le mode. */
  body?: string;
  /** Données spécifiques au mode (visibility, prix, etc.) — sérialisable JSON. */
  data?: Record<string, unknown>;
  /** Timestamp ISO de la dernière sauvegarde. */
  saved_at: string;
};

type OpenOptions = {
  mode: CreatorMode;
  /** Fichiers passés depuis un drag-drop ou file picker externe. */
  initialMedia?: File[];
  /** Force ignorer le draft existant (ex : nouveau post depuis un cercle). */
  ignoreDraft?: boolean;
  /** Métadonnées contextuelles (ex : { circleId } pour un post dans un cercle). */
  context?: Record<string, unknown>;
};

type CreatorState = {
  open: boolean;
  mode: CreatorMode | null;
  initialMedia: File[];
  context: Record<string, unknown>;
};

type CreatorContextValue = {
  state: CreatorState;
  open: (options: OpenOptions) => void;
  close: () => void;
  switchMode: (mode: CreatorMode) => void;
  /** Sauvegarde le draft du mode courant. */
  saveDraft: (draft: Omit<CreatorDraft, "saved_at">) => void;
  /** Lit le draft persisté pour un mode donné. NULL si vide ou expiré. */
  readDraft: (mode: CreatorMode) => CreatorDraft | null;
  clearDraft: (mode: CreatorMode) => void;
};

const CreatorContext = createContext<CreatorContextValue | null>(null);

const DRAFT_PREFIX = "divarc:creator-draft:";
/* Drafts expirent après 7 jours pour ne pas pourrir le storage. */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function CreatorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CreatorState>({
    open: false,
    mode: null,
    initialMedia: [],
    context: {},
  });

  /* Ref pour ne JAMAIS lire le state dans une closure obsolète depuis les
     callbacks exposés (qui sont mémorisés). */
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const open = useCallback((options: OpenOptions) => {
    setState({
      open: true,
      mode: options.mode,
      initialMedia: options.initialMedia ?? [],
      context: options.context ?? {},
    });
  }, []);

  const close = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  const switchMode = useCallback((mode: CreatorMode) => {
    setState((s) => ({ ...s, mode }));
  }, []);

  const saveDraft = useCallback(
    (draft: Omit<CreatorDraft, "saved_at">) => {
      const mode = stateRef.current.mode;
      if (!mode || typeof window === "undefined") return;
      try {
        const payload: CreatorDraft = {
          ...draft,
          saved_at: new Date().toISOString(),
        };
        window.localStorage.setItem(
          DRAFT_PREFIX + mode,
          JSON.stringify(payload),
        );
      } catch {
        /* Quota exceeded ou storage indisponible — ignore silencieusement. */
      }
    },
    [],
  );

  const readDraft = useCallback((mode: CreatorMode): CreatorDraft | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(DRAFT_PREFIX + mode);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CreatorDraft;
      const age =
        Date.now() - new Date(parsed.saved_at ?? 0).getTime();
      if (!Number.isFinite(age) || age > DRAFT_TTL_MS) {
        window.localStorage.removeItem(DRAFT_PREFIX + mode);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const clearDraft = useCallback((mode: CreatorMode) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(DRAFT_PREFIX + mode);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<CreatorContextValue>(
    () => ({ state, open, close, switchMode, saveDraft, readDraft, clearDraft }),
    [state, open, close, switchMode, saveDraft, readDraft, clearDraft],
  );

  return (
    <CreatorContext.Provider value={value}>{children}</CreatorContext.Provider>
  );
}

export function useCreator(): CreatorContextValue {
  const ctx = useContext(CreatorContext);
  if (!ctx) {
    throw new Error("useCreator must be used within <CreatorProvider>");
  }
  return ctx;
}
