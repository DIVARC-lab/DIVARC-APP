"use client";

import { useCallback, useEffect, useState } from "react";

/* Étape 14 du chantier Feed FB-style — indicateur "déjà vu".
 *
 * Stocke en localStorage les IDs des posts que l'user a "consultés"
 * (cliqué sur Commenter, ouvert le modal détail, navigué vers /feed/[id]).
 * Au prochain affichage dans le feed, ces posts sont visuellement
 * marqués (opacity légère ou border gold subtle).
 *
 * Persistence : localStorage (par device, pas par compte). Cap à 500
 * IDs pour éviter de gonfler — FIFO eviction.
 */

const STORAGE_KEY = "divarc:feed:visited-posts";
const MAX_SIZE = 500;

function loadFromStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function saveToStorage(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    /* FIFO cap : garde les MAX_SIZE derniers ajoutés. Les Set JS
       conservent l'ordre d'insertion donc on slice depuis la fin. */
    const arr = Array.from(set);
    const capped = arr.slice(-MAX_SIZE);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  } catch {
    /* Quota exceeded ou bloqué — silently ignore. */
  }
}

/* Hook pour lire + marquer comme visité un post.
 *
 * Optimisation : on stocke le Set côté state pour bypass re-render et
 * sync localStorage lazily. `isVisited(id)` est synchrone et stable.
 */
export function useVisitedPosts() {
  const [visited, setVisited] = useState<Set<string>>(() => new Set());

  /* Hydrate depuis localStorage au mount (côté client uniquement). */
  useEffect(() => {
    setVisited(loadFromStorage());
  }, []);

  const isVisited = useCallback(
    (postId: string) => visited.has(postId),
    [visited],
  );

  const markVisited = useCallback((postId: string) => {
    setVisited((prev) => {
      if (prev.has(postId)) return prev;
      const next = new Set(prev);
      next.add(postId);
      saveToStorage(next);
      return next;
    });
  }, []);

  return { isVisited, markVisited };
}
