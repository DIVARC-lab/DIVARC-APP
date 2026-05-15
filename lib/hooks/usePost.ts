"use client";

/* usePost — hook pour charger un post + ses commentaires + state local.
 *
 * Use cases :
 *  - PostMediaViewer : besoin de comments à l'ouverture
 *  - PostDetailModal : besoin du post complet + comments
 *  - /feed/[id]/page.tsx peut aussi consommer (mais SSR direct y est
 *    préférable, on l'utilise plutôt pour le re-fetch après refresh)
 *
 * Optimistic helpers : addComment / removeComment / patchComment pour
 * que les enfants (CommentForm, CommentList) puissent updater le state
 * sans refetch. */

import { useCallback, useEffect, useState } from "react";
import { loadPostDetails } from "@/app/(app)/feed/actions";
import type { CommentWithAuthor } from "@/lib/database.types";

export type UsePostOptions = {
  postId: string;
  /* Si on a déjà les commentaires SSR, on hydrate sans refetch. */
  initialComments?: CommentWithAuthor[];
  /* Si false, le hook ne fait pas le fetch initial (utile pour les
     modales qui ouvrent à la demande). */
  enabled?: boolean;
};

export function usePost({
  postId,
  initialComments,
  enabled = true,
}: UsePostOptions) {
  const [comments, setComments] = useState<CommentWithAuthor[]>(
    initialComments ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (initialComments) return; // déjà hydraté
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadPostDetails(postId).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setComments(res.comments);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [postId, enabled, initialComments]);

  const addComment = useCallback((c: CommentWithAuthor) => {
    setComments((prev) => [c, ...prev]);
  }, []);

  const removeComment = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  const patchComment = useCallback(
    (commentId: string, patch: Partial<CommentWithAuthor>) => {
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, ...patch } : c)),
      );
    },
    [],
  );

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await loadPostDetails(postId);
    if (res.ok) {
      setComments(res.comments);
    }
    setLoading(false);
  }, [postId]);

  return {
    comments,
    loading,
    error,
    addComment,
    removeComment,
    patchComment,
    refetch,
  };
}
